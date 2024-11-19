import Authentications from "#schemas/authentications.js";
import Stores from "#schemas/stores.js";
import Crypto from "crypto";
import { BASIC_AUTH_SCOPE } from "#constants/shopify.js";
import logger from "#common-functions/logger/index.js";
import QueryString from "querystring";
import PasswordGenerator from "generate-password";
import { EncryptJWT, DecryptJWT } from "#utils/auth.js";
import AddInitialWebhooks from "#utils/shopify/add-initial-webhooks.js";
// import publish from "../../common-functions/redis/publish.js";

export async function RedirectToShopifyAuth(req) {
  const { shop } = req.query;
  if (!shop) {
    return { status: 400, message: "Required parameters missing" };
  }
  const state = Crypto.randomBytes(16).toString("hex");
  const shopifyAuthUrl = `https://${shop}/admin/oauth/authorize?client_id=${process.env.SHOPIFY_CLIENT_ID}&scope=${BASIC_AUTH_SCOPE}&state=${state}&redirect_uri=${process.env.SHOPIFY_API_REDIRECT_URI}`;

  const authentication = await Authentications.findOne({
    storeUrl: shop,
  }).lean();

  if (authentication) {
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
}

export async function ShopifyAuthCallback(req) {
  const { shop, hmac, code } = req.query;

  if (!shop || !hmac || !code) {
    logger("info", "ShopifyCallback.Params.Missing");
    return { status: 400, message: "Required parameters missing" };
  }

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
      Crypto.createHmac("sha256", process.env.SHOPIFY_CLIENT_SECRET)
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
    logger("info", "ShopifyCallback.HMAC.Failed");
    return { status: 400, message: "HMAC validation failed" };
  }

  const accessTokenRequestUrl = `https://${shop}/admin/oauth/access_token?client_id=${process.env.SHOPIFY_CLIENT_ID}&client_secret=${process.env.SHOPIFY_CLIENT_SECRET}&code=${code}`;

  const storeExistence = await Authentications.findOne({
    storeUrl: shop,
  }).lean();

  if (storeExistence) {
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
    );
    // redirect to frontend with the token which will allow them to be logged in

    return {
      redirect: true,
      url: `${process.env.LOGIN_PAGE_URL}?verify=${platformAuthToken}`,
    };
  } catch (e) {
    console.log(e);
    logger("error", "ShopifyCallback.AccessToken.Error", e);
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
    logger("error", "LoginFromToken.Error", e);
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
      email,
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

    if (hash !== authentication.password_hash) {
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
    logger("error", "LoginFromPassword.Error", e);
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

async function GetStoreAuthToken(storeData, accessToken) {
  // generate a random password and send to their email

  logger("info", `Received store data to save ${JSON.stringify(storeData)}`);

  const store = await Stores.create({
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
  });

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

  // await AddInitialWebhooks(storeData.myshopify_domain, accessToken);

  logger("info", "Added store's default webhooks");

  const authentication = await Authentications.create({
    email: storeData.email,
    name: storeData.shop_owner,
    storeUrl: storeData.myshopify_domain,
    // eslint-disable-next-line no-underscore-dangle
    store: store._id,
    password_salt: salt,
    password_hash: hash,
  });

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
