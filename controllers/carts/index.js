import {
  CREATE_CART_STORE_FRONT,
  CREATE_PRODUCT_WITH_MEDIA,
  GET_PRODUCT_USING_VARIANT_ID,
  GET_PUBLICATIONS,
  PRODUCT_VARIANT_BULK_UPDATE,
  PUBLISH_PRODUCT,
} from "#common-functions/shopify/queries.js";
import logger from "#common-functions/logger/index.js";
import executeShopifyQueries from "#common-functions/shopify/execute.js";
import executeShopifyStorefrontQueries from "#common-functions/shopify/executeStoreFront.js";
import Stores from "#schemas/stores.js";
import Bundles from "#schemas/bundles.js";

/*
  {
    userEmail : String,
    products : [
      {
      variantId : String,
      quantity : Number,
      packaging : boolean
      }
    ]
  }
*/
export const CreateCart = async (req) => {
  try {
    const { products, userEmail } = req.body;
    const marketplace = await Stores.findOne({
      isInternalStore: true,
      isActive: true,
    }).lean();
    if (!marketplace) {
      return {
        message: "Marketplace not found",
        status: 404,
      };
    }
    const lineItems = [];
    for (const product of products) {
      // check if product is packaging or not
      if (!product.variantId) {
        throw new Error("Variant id not provided");
      }
      if (product.packaging) {
        // fetch the product using the variant
        const shopifyProductVariant = await fetchProductBasedOffVariant({
          accessToken: marketplace.accessToken,
          storeUrl: marketplace.storeUrl,
          variantId: product.variantId,
        });
        if (!shopifyProductVariant || !shopifyProductVariant.productId) {
          throw new Error("Invalid variant id provided");
        }

        const isBundlePresentOnDb = await Bundles.findOne({
          shopifyProductId: shopifyProductVariant.productId,
        })
          .populate("box")
          .lean();

        if (!isBundlePresentOnDb) {
          throw new Error("The product is invalid.");
        }
        const newProductVariables = {
          input: {
            title: `${isBundlePresentOnDb.name} ${shopifyProductVariant.title} With giftbox`,
            descriptionHtml: `This product is auto generated for ${shopifyProductVariant.title}`,
            tags: ["auto-generated"],
            status: "ACTIVE",
            vendor: isBundlePresentOnDb.vendor,
            productOptions: [
              {
                name: "Default",
                values: [
                  { name: `${shopifyProductVariant.title} With giftbox` },
                ],
              },
            ],
            metafields: [
              {
                namespace: "custom",
                key: "original_product",
                value: JSON.stringify({
                  variantId: product.variantId,
                  productId: shopifyProductVariant.productId,
                  box: isBundlePresentOnDb.box._id,
                }),
                type: "json_string",
              },
            ],
          },
          media: [],
        };
        if (isBundlePresentOnDb.coverImage) {
          newProductVariables.media.push({
            mediaContentType: "IMAGE",
            originalSource: isBundlePresentOnDb.coverImage.url,
            alt: `Cover image for ${isBundlePresentOnDb.name}`,
          });
        }

        let newProduct;
        try {
          newProduct = await executeShopifyQueries({
            query: CREATE_PRODUCT_WITH_MEDIA,
            accessToken: marketplace.accessToken,
            callback: (result) => {
              return result.data?.productCreate?.product;
            },
            storeUrl: marketplace.storeUrl,
            variables: newProductVariables,
          });

          logger("info", "Successfully created the product on the store");
        } catch (e) {
          logger("error", `[create-cart] Could not create store product`, e);
          throw new Error(e);
        }

        if (!newProduct) {
          logger("error", "[create-cart] Could not create a new product ", e);
          throw new Error("Could not create a new product on the marketplace");
        }

        const newVariant = newProduct.variants?.edges[0]?.node;
        if (!newVariant) {
          logger(
            "error",
            "[create-cart] Could not find the new product variant",
          );
          throw new Error("Could not find the new product variant");
        }

        const variantUpdatePayload = {
          productId: newProduct.id,
          variants: [
            {
              id: newVariant.id,
              price:
                Number(shopifyProductVariant.price) +
                  Number(isBundlePresentOnDb.box?.price) ?? 0,
            },
          ],
        };

        try {
          await executeShopifyQueries({
            variables: variantUpdatePayload,
            accessToken: marketplace.accessToken,
            callback: null,
            query: PRODUCT_VARIANT_BULK_UPDATE,
            storeUrl: marketplace.storeUrl,
          });
        } catch (e) {
          logger(
            "error",
            "[create-cart] Could not update the new product variant",
          );
          throw e;
        }
        // publish product on the storefront app.
        let storefrontPublish;
        try {
          storefrontPublish = await executeShopifyQueries({
            accessToken: marketplace.accessToken,
            query: GET_PUBLICATIONS,
            storeUrl: marketplace.storeUrl,
            callback: (result) => {
              const publications = result.data?.publications?.edges;

              if (!publications || publications.length === 0) {
                return null;
              }

              const targetPublication = publications.find(
                (edge) =>
                  edge.node.name === process.env.SHOPIFY_STORE_FRONT_APP_NAME,
              );

              return targetPublication ? targetPublication.node : null;
            },
          });
          logger("info", "successfully fetched the publications");
        } catch (e) {
          logger(
            "error",
            "[create-cart] Could not fetch the store front publications",
          );
          throw e;
        }

        if (!storefrontPublish) {
          throw new Error(
            "[create-cart] Could not fetch the storefront publications",
          );
        }

        try {
          await executeShopifyQueries({
            accessToken: marketplace.accessToken,
            storeUrl: marketplace.storeUrl,
            query: PUBLISH_PRODUCT,
            variables: {
              productId: newProduct.id,
              publicationId: storefrontPublish.id,
            },
          });
        } catch (e) {
          logger("error", "[create-cart] Could not publish the product");
          throw e;
        }

        const newBundle = await Bundles.create({
          name: `${shopifyProductVariant.title} With giftbox`,
          description: `This Temp product is auto generated for ${shopifyProductVariant.title}`,
          tags: ["auto-generated"],
          status: "draft",
          shopifyProductId: newProduct.id,
          vendor: "marketplace",
          price:
            Number(shopifyProductVariant.price) +
              Number(isBundlePresentOnDb.box.price) ?? 0,
          store: isBundlePresentOnDb.store,
          isTemp: true,
        });
        if (!newBundle) {
          logger("error", "Could not save the temporary product on the db.");
          throw new Error("Could not save the temporary product on the db.");
        }

        lineItems.push({
          merchandiseId: newVariant.id,
          quantity: product.quantity || 1,
        });
      } else {
        const shopifyProductVariant = await fetchProductBasedOffVariant({
          accessToken: marketplace.accessToken,
          storeUrl: marketplace.storeUrl,
          variantId: product.variantId,
        });

        lineItems.push({
          merchandiseId: shopifyProductVariant.id,
          quantity: product.quantity,
        });
      }
      // if the product is packaging create a new product with the packaging price + bundle price.
      // add the product in lineItems
      // if the product is not packaging then add the product as it is in the lineItems
    }
    const emailObj = {};
    if (userEmail) {
      emailObj["buyerIdentity"] = {
        email: userEmail,
      };
    }
    const createCartPayload = {
      input: {
        ...emailObj,
        lines: lineItems,
      },
    };
    let cart;
    try {
      cart = await executeShopifyStorefrontQueries({
        accessToken: process.env.SHOPIFY_STORE_FRONT_TOKEN,
        query: CREATE_CART_STORE_FRONT,
        callback: (result) => {
          return result?.data?.cartCreate?.cart;
        },
        storeUrl: marketplace.storeUrl,
        variables: createCartPayload,
      });
    } catch (e) {
      logger(
        "error",
        "[create-cart] Could not create the cart for user " + userEmail,
        e,
      );
      throw e;
    }
    if (!cart) {
      logger(
        "error",
        "[create-cart] Could not create the cart for user " + userEmail,
      );
      throw new Error("Could not create the cart for the user");
    }

    return {
      status: 200,
      message: "successfully create the new cart for user",
      data: cart,
    };

    // Create a new checkout with the products provided.
  } catch (e) {
    return {
      message: e.message,
      status: 500,
    };
  }
};

// module specific fns
const fetchProductBasedOffVariant = async ({
  variantId,
  accessToken,
  storeUrl,
}) => {
  let shopifyProductVariant;
  try {
    shopifyProductVariant = await executeShopifyQueries({
      accessToken: accessToken,
      storeUrl: storeUrl,
      query: GET_PRODUCT_USING_VARIANT_ID,
      callback: (result) => {
        const variant = result.data?.productVariant;

        // Extracting price
        const { id, price, title } = variant;
        // Extracting the metafield with namespace "custom" and key "bundle_components"
        const metafield = variant.product?.metafields?.edges.find(
          (edge) =>
            edge.node.namespace === "custom" &&
            edge.node.key === "bundle_components",
        )?.node;

        const bundleComponents = metafield ? JSON.parse(metafield.value) : null;

        return {
          id,
          price,
          title,
          bundleComponents,
          productId: variant.product.id,
        };
      },
      variables: {
        variantId: variantId,
      },
    });
    logger("successfully fetched the product using the variant id");
  } catch (e) {
    logger(
      "error",
      "[create-cart] Error when fetching the product using the product variant id",
      e,
    );
  }
  if (!shopifyProductVariant) {
    throw new Error("Invalid variant id provided");
  }
  return shopifyProductVariant;
};
