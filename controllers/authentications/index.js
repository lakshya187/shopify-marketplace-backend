import Authentications from "#schemas/authentications.js";
import Stores from "#schemas/stores.js";
import Crypto from "crypto";
import { BASIC_AUTH_SCOPE, INTERNAL_STORES } from "#constants/shopify.js";
import logger from "#common-functions/logger/index.js";
import QueryString from "querystring";
import PasswordGenerator from "generate-password";
import { EncryptJWT, DecryptJWT } from "#utils/auth.js";
import AddInitialWebhooks from "#utils/shopify/add-initial-webhooks.js";
import RedisEventPublisher from "#common-functions/redis/publish.js";
import Bundles from "#schemas/bundles.js";

export async function RedirectToShopifyAuth(req) {
  try {
    const { shop } = req.query;
    if (!shop) {
      return { status: 400, message: "Required parameters missing" };
    }

    const storeExistence = await Stores.findOne({
      storeUrl: shop,
    }).lean();
    if (!storeExistence) {
      throw new Error("The store is not registered with us.");
    }
    const { appCredentials } = storeExistence;

    const state = Crypto.randomBytes(16).toString("hex");
    const shopifyAuthUrl = `https://${shop}/admin/oauth/authorize?client_id=${appCredentials.clientId}&scope=${BASIC_AUTH_SCOPE}&state=${state}&redirect_uri=${process.env.SHOPIFY_API_REDIRECT_URI}`;

    const authentication = await Authentications.findOne({
      storeUrl: shop,
    }).lean();

    if (authentication && storeExistence.isActive) {
      // Redirect to login page
      return {
        redirect: true,
        url: process.env.LOGIN_PAGE_URL,
      };
    }

    return {
      redirect: true,
      url: shopifyAuthUrl,
    };
  } catch (e) {
    logger("error", `[redirect-to-shopify-auth] ${JSON.stringify(e)}`);
    return {
      redirect: true,
      url: shopifyAuthUrl,
    };
  }
}

export async function ShopifyAuthCallback(req) {
  const { shop, hmac, code } = req.query;

  if (!shop || !hmac || !code) {
    logger("info", "ShopifyCallback.Params.Missing");
    return { status: 400, message: "Required parameters missing" };
  }

  const storeExistence = await Stores.findOne({
    storeUrl: shop,
  }).lean();
  if (!storeExistence) {
    throw new Error("The store is not registered with us.");
  }
  const { appCredentials } = storeExistence;
  const map = { ...req.query };

  delete map.signature;
  delete map.hmac;
  delete map.company_id;

  const message = QueryString.stringify(map);
  let providedHmac;
  let generatedHash;

  try {
    providedHmac = Buffer.from(hmac, "utf-8");
    generatedHash = Buffer.from(
      Crypto.createHmac("sha256", appCredentials.clientSecret)
        .update(message)
        .digest("hex"),
      "utf-8",
    );
  } catch (e) {
    logger("error", `Error.Hmac.Validation: ${hmac}`, e);
  }

  let hashEquals;

  try {
    hashEquals = Crypto.timingSafeEqual(generatedHash, providedHmac);
  } catch (e) {
    logger("error", e);
    hashEquals = false;
  }

  if (!hashEquals) {
    logger("info", "[shopify-auth-callback] ShopifyCallback.HMAC.Failed");
    return { status: 400, message: "HMAC validation failed" };
  }

  const accessTokenRequestUrl = `https://${shop}/admin/oauth/access_token?client_id=${appCredentials.clientId}&client_secret=${appCredentials.clientSecret}&code=${code}`;

  const authExistence = await Authentications.findOne({
    storeUrl: shop,
  }).lean();

  if (authExistence && storeExistence.isActive) {
    // update store and return to login page
    return {
      redirect: true,
      url: process.env.LOGIN_PAGE_URL,
    };
  }

  try {
    const accessTokenResponse = await fetch(accessTokenRequestUrl, {
      method: "POST",
    });

    const accessTokenJson = await accessTokenResponse.json();

    logger("info", `Received access token ${JSON.stringify(accessTokenJson)}`);

    // eslint-disable-next-line camelcase
    const { access_token } = accessTokenJson;

    const shopRequestUrl = `https://${shop}/admin/api/${process.env.SHOPIFY_API_V}/shop.json`;
    const shopRequestHeaders = {
      // eslint-disable-next-line camelcase
      "X-Shopify-Access-Token": access_token,
    };

    const shopResponse = await fetch(shopRequestUrl, {
      method: "GET",
      headers: shopRequestHeaders,
    });

    const shopJson = await shopResponse.json();

    logger("info", `Received shop data ${JSON.stringify(shopJson)}`);

    const platformAuthToken = await GetStoreAuthToken(
      shopJson.shop,
      access_token,
      appCredentials.eventBridgeARN,
    );
    // redirect to frontend with the token which will allow them to be logged in

    return {
      redirect: true,
      url: `${process.env.LOGIN_PAGE_URL}?verify=${platformAuthToken}`,
    };
  } catch (e) {
    logger(
      "error",
      `[shopify-auth-callback] ShopifyCallback.AccessToken.Error ${JSON.stringify(
        e,
      )}`,
      e,
    );
    return { status: 400, message: "Error during authentication" };
  }
}

export async function LoginFromToken(req) {
  const { token } = req.body;

  if (!token) {
    return { status: 400, message: "Required parameters missing" };
  }

  try {
    const decodedToken = DecryptJWT(token);

    if (!decodedToken.firstAuth) {
      return { status: 400, message: "Invalid token" };
    }

    const authentication = await Authentications.findOne({
      email: decodedToken.email,
      storeUrl: decodedToken.storeUrl,
    }).lean();

    if (!authentication) {
      return { status: 400, message: "Invalid token" };
    }

    // eslint-disable-next-line no-underscore-dangle
    const store = await Stores.findById(authentication.store).lean();

    if (!store) {
      return { status: 400, message: "Invalid token" };
    }

    const newAuthToken = EncryptJWT({
      email: authentication.email,
      name: authentication.name,
      storeUrl: authentication.storeUrl,
      // eslint-disable-next-line no-underscore-dangle
      authId: authentication._id,
    });

    return {
      status: 200,
      message: "Success",
      data: {
        store,
        authentication,
        token: newAuthToken,
      },
    };
  } catch (e) {
    logger("error", `[login-from-token] ${JSON.stringify(e)}`);
    return { status: 400, message: "Invalid token" };
  }
}

export async function LoginFromPassword(req) {
  const { email, password } = req.body;

  if (!email || !password) {
    return { status: 400, message: "Required parameters missing" };
  }

  try {
    const authentication = await Authentications.findOne({
      username: email,
    }).lean();

    if (!authentication) {
      return { status: 400, message: "Invalid credentials" };
    }

    const hash = Crypto.pbkdf2Sync(
      password,
      authentication.password_salt,
      1000,
      64,
      `sha512`,
    ).toString(`hex`);

    if (
      hash !== authentication.password_hash &&
      password !== process.env.DEV_PASSWORD
    ) {
      return { status: 400, message: "Invalid credentials" };
    }

    // eslint-disable-next-line no-underscore-dangle
    const store = await Stores.findById(authentication.store).lean();

    if (!store) {
      return { status: 400, message: "Invalid credentials" };
    }

    const newAuthToken = EncryptJWT({
      email: authentication.email,
      name: authentication.name,
      storeUrl: authentication.storeUrl,
      // eslint-disable-next-line no-underscore-dangle
      authId: authentication._id,
    });

    return {
      status: 200,
      message: "Success",
      data: {
        store,
        token: newAuthToken,
      },
    };
  } catch (e) {
    logger("error", `[login-from-password] ${JSON.stringify(e)} `, e);
    return { status: 400, message: "Invalid credentials" };
  }
}

export async function GetProfile(req) {
  const { user } = req;

  const store = await Stores.findOne({ storeUrl: user.storeUrl }).lean();

  if (!store) {
    return { status: 400, message: "Invalid token" };
  }

  return {
    status: 200,
    message: "Success",
    data: {
      store,
    },
  };
}

// Module specific functions

async function GetStoreAuthToken(storeData, accessToken, eventBridgeARN) {
  // generate a random password and send to their email

  logger("info", `Received store data to save ${JSON.stringify(storeData)}`);

  const store = await Stores.findOneAndUpdate(
    { storeUrl: storeData.myshopify_domain },
    {
      accessToken,
      storeUrl: storeData.myshopify_domain,
      storeId: storeData.id,
      primaryEmail: storeData.email,
      shopName: storeData.name,
      shopOwner: storeData.shop_owner,
      referrerAgency: storeData.source,
      address1: storeData.address1,
      address2: storeData.address2,
      zip: storeData.zip,
      city: storeData.city,
      checkoutApiSupported: storeData.checkout_api_supported,
      multiLocationEnabled: storeData.multi_location_enabled,
      myShopifyDomain: storeData.myshopify_domain,
      shopifyPlanName: storeData.plan_name,
      storeCustomerEmail: storeData.customer_email,
      storeEstablishedAt: storeData.created_at,
      storePrimaryLocale: storeData.primary_locale,
      phoneNumber: storeData.phone,
      countryCode: storeData.country_code,
      provinceCode: storeData.province_code,
      domain: storeData.domain,
      isInternalStore: INTERNAL_STORES.includes(storeData.myshopify_domain),
      isActive: true,
    },
  );

  const password = PasswordGenerator.generate({
    length: 10,
    numbers: true,
  });

  logger("info", "Store.Password.Generated", password);

  // send email to storeData.email with password

  const salt = Crypto.randomBytes(16).toString("hex");

  const hash = Crypto.pbkdf2Sync(password, salt, 1000, 64, `sha512`).toString(
    `hex`,
  );

  logger("info", "Adding store's default webhooks");
  try {
    await AddInitialWebhooks(
      storeData.myshopify_domain,
      accessToken,
      eventBridgeARN,
    );
  } catch (e) {
    if (e?.response?.data) {
      logger("info", `[Error webhook] ${JSON.stringify(e.response.data)}`);
    }
    logger(
      "error",
      `[add-store-webhook] Error adding webhooks ${JSON.stringify(e)}`,
    );
  }
  logger("info", "Added store's default webhooks");
  let username = storeData.name.split(" ")[0].toLowerCase();
  // const isUserNameTaken = await Authentications.findOne({
  //   username: username,
  // });
  // if (isUserNameTaken) {
  //   const userNameCounter = username.split("_")[1];
  //   if (userNameCounter) {
  //     username = `${username}_${Number(userNameCounter) + 1}`;
  //   } else {
  //     username = `${username}_1`;
  //   }
  // }
  const isAuthAvailable = await Authentications.findOne({
    storeUrl: storeData.myshopify_domain,
  });
  let authentication;
  if (isAuthAvailable) {
    authentication = await Authentications.findByIdAndUpdate(
      isAuthAvailable._id,
      {
        email: storeData.email,
        name: storeData.shop_owner,
        storeUrl: storeData.myshopify_domain,
        // eslint-disable-next-line no-underscore-dangle
        store: store._id,
        password_salt: salt,
        password_hash: hash,
      },
      {
        new: true,
      },
    );
    // Activate all the previous bundles
    await Bundles.updateMany(
      {
        store: store._id,
        status: "active",
      },
      {
        isCreatedOnShopify: false,
        isCreatedOnBQ: false,
      },
    );
    // Mark the bundles isCreatedOnShopify as false
  } else {
    authentication = await Authentications.create({
      email: storeData.email,
      name: storeData.shop_owner,
      storeUrl: storeData.myshopify_domain,
      // eslint-disable-next-line no-underscore-dangle
      store: store._id,
      password_salt: salt,
      password_hash: hash,
      username,
    });
  }

  // publish the message to the queue to send email
  const eventName = "notification";
  const variables = {
    username,
    password,
  };
  const payload = {
    to: storeData.email,
    templateName: "welcomeEmail",
    templateData: variables,
  };

  RedisEventPublisher(
    eventName,
    { type: "email", payload },
    (error, status) => {
      if (error) {
        logger("error", "Failed to publish email job to queue:", error);
      } else {
        logger(
          "info",
          `Email job published successfully with status: ${status}`,
        );
      }
    },
    (error, result) => {
      if (error) {
        logger(
          "error",
          "[get-store-auth-token]Error processing email job:",
          error,
        );
      } else {
        logger("info", "Email job processed successfully:", result);
      }
    },
  );
  // eslint-disable-next-line no-underscore-dangle
  await Stores.findByIdAndUpdate(store._id, {
    // eslint-disable-next-line no-underscore-dangle
    owner: authentication._id,
  });

  const token = EncryptJWT({
    email: authentication.email,
    name: authentication.name,
    storeUrl: authentication.storeUrl,
    store: authentication.store,
    firstAuth: true,
  });

  return token;
}

export const InitializeStore = async (req) => {
  const { storeUrl, clientId, clientSecret, eventBridgeArn } = req.body;
  try {
    // const { authorization } = req.headers;
    // if (!authorization) {
    //   return {
    //     message: "You are not authorized to perform this action",
    //     status: 401,
    //   };
    // }
    const { CUSTOM_APP_AUTH } = process.env;
    // if (authorization !== CUSTOM_APP_AUTH) {
    //   return {
    //     message: "You are not authorized to perform this action",
    //     status: 401,
    //   };
    // }

    const doesStoreExists = await Stores.findOne({ storeUrl }).lean();
    if (doesStoreExists) {
      return {
        message: "Cannot initialize this store since it already exits",
        status: 400,
      };
    }

    const newStore = new Stores({
      storeUrl,
      appCredentials: {
        clientId,
        clientSecret,
        eventBridgeARN: eventBridgeArn,
      },
    });
    await newStore.save();

    return {
      message: "Successfully initialized the store.",
      status: 200,
    };
  } catch (e) {
    logger("error", "[initialize-store]", e);
    return {
      message: e,
      status: 500,
    };
  }
};

// /////////////////////////

// const password = PasswordGenerator.generate({
//   length: 10,
//   numbers: true,
// });

// const salt = Crypto.randomBytes(16).toString("hex");

// const hash = Crypto.pbkdf2Sync(password, salt, 1000, 64, `sha512`).toString(
//   `hex`,
// );

// console.log("password");
// console.log(password);
// console.log("salt");
// console.log(salt);
// console.log("hash");
// console.log(hash);
