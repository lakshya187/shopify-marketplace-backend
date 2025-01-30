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
import StoreBoxes from "#schemas/storeBoxes.js";

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
    const storeInventory = await StoreBoxes.findOne({
      store: marketplace._id,
    }).lean();
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
        const box = storeInventory.inventory.find(
          (inv) =>
            inv.box.toString() === isBundlePresentOnDb.box._id.toString(),
        );
        lineItems.push({
          merchandiseId: product.variantId,
          quantity: product.quantity,
          attributes: [{ key: "packaging", value: "true" }],
        });
        if (box && box.remaining) {
          lineItems.push({
            merchandiseId: box.shopify?.variantId,
            quantity: product.quantity,
            // attributes: [{ key: "ignore", value: "true" }],
          });
        }
      } else {
        const shopifyProductVariant = await fetchProductBasedOffVariant({
          accessToken: marketplace.accessToken,
          storeUrl: marketplace.storeUrl,
          variantId: product.variantId,
        });
        if (!shopifyProductVariant) {
          throw new Error("invalid variant id provided");
        }
        lineItems.push({
          merchandiseId: shopifyProductVariant.id,
          quantity: product.quantity,
          attributes: [{ key: "packaging", value: "false" }],
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
