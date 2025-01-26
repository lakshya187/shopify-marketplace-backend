import Stores from "#schemas/stores.js";
import StoreBoxes from "#schemas/storeBoxes.js";
import StoreBoxOrders from "#schemas/storeBoxOrders.js";
import logger from "#common-functions/logger/index.js";
import Bundles from "#schemas/bundles.js";
import executeShopifyQueries from "#common-functions/shopify/execute.js";
import {
  CREATE_PRODUCT_WITH_MEDIA,
  GET_PRODUCT_DETAILS,
  GET_PRODUCT_VARIANTS_INVENTORY,
  GET_STORE_LOCATION,
  INVENTORY_ADJUST_QUANTITIES,
  PRODUCT_VARIANT_BULK_UPDATE,
  PRODUCT_VARIANTS_CREATE,
} from "#common-functions/shopify/queries.js";
import {
  BUNDLE_PACKAGING_NAMESPACE,
  BUNDLE_PACKAGING_VARIANT,
} from "#constants/global.js";

export const CreateStoreBoxOrder = async (req) => {
  try {
    const { orderItems } = req.body;
    const { user } = req;
    const [store] = await Stores.find({
      storeUrl: user.storeUrl,
    }).lean();

    if (!store) {
      return {
        status: 400,
        message: "Store not found",
      };
    }

    let totalQuantity = 0;
    const orderMap = {};

    orderItems.forEach((item) => {
      if (!item.box || !item.quantity || Number(item.quantity) <= 0) {
        throw new Error(
          "Each order item must include a valid packaging ID and a positive quantity.",
        );
      }
      if (!orderMap[item.box]) {
        orderMap[item.box] = {
          box: item.box,
          quantity: 0,
        };
      }
      orderMap[item.box]["quantity"] += Number(item.quantity);
      totalQuantity += Number(item.quantity);
    });
    const mergedOrderItems = Object.values(orderMap);
    const newOrder = new StoreBoxOrders({
      store: store._id,
      orderItems: mergedOrderItems,
      totalQuantity,
    });

    const order = await newOrder.save();

    return {
      message: "Successfully created the store order.",
      status: 200,
      data: order,
    };
  } catch (e) {
    return {
      message: e.message || "An error occurred while creating the store order.",
      status: 500,
    };
  }
};

export const GetAllBoxOrders = async (req) => {
  try {
    const { user } = req;

    const { page = 1 } = req.query;
    const limit = 10;
    const skip = (Number(page) - 1) * limit;
    const store = await Stores.findOne({ storeUrl: user.storeUrl }).lean();

    if (!store) {
      return {
        status: 400,
        message: "Store not found",
      };
    }

    const boxOrders = await StoreBoxOrders.find({ store: store._id })
      .populate({
        path: "orderItems.box",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return {
      status: 200,
      message: "Box orders retrieved successfully",
      data: boxOrders,
    };
  } catch (e) {
    return {
      status: 500,
      message: e.message || "An error occurred while fetching box orders",
    };
  }
};

export const UpdateStoreBoxOrder = async (req) => {
  try {
    const { user } = req;

    const [store] = await Stores.find({
      storeUrl: user.storeUrl,
    }).lean();
    // if (!store.isInternalStore) {
    //   return {
    //     status: 401,
    //     message: "You are not allowed to modify this order",
    //   };
    // }
    const marketplace = await Stores.findOne({
      isInternalStore: true,
      isActive: true,
    });
    if (!store) {
      return {
        status: 400,
        message: "Store not found",
      };
    }
    const { id } = req.params;
    const { status } = req.body;

    const doesBoxOrderExists = await StoreBoxOrders.findById(id)
      .populate({
        path: "orderItems.box",
      })
      .lean();

    if (!doesBoxOrderExists) {
      return {
        message: "The box order id does not exists",
        status: 400,
      };
    }
    const [storeBoxInventory] = await StoreBoxes.find({
      store: doesBoxOrderExists.store,
    }).lean();

    if (status === "delivered") {
      let storeBoxPromise = null;
      const newInventory = [];
      if (storeBoxInventory) {
        // Create a map of existing inventory for easy lookup
        const existingInventoryMap = new Map(
          storeBoxInventory.inventory.map((item) => [
            item.box.toString(),
            item,
          ]),
        );

        // Update existing inventory or prepare new entries
        doesBoxOrderExists.orderItems.forEach((orderItem) => {
          const boxId = orderItem.box._id.toString();
          if (existingInventoryMap.has(boxId)) {
            // Update existing inventory
            const existingItem = existingInventoryMap.get(boxId);
            existingItem.quantity += orderItem.quantity;
            existingItem.remaining += orderItem.quantity;
          } else {
            // Add new inventory
            existingInventoryMap.set(boxId, {
              box: orderItem.box._id,
              quantity: orderItem.quantity,
              remaining: orderItem.quantity,
              used: 0,
            });
          }
        });

        // Convert the map back to an array
        const updatedInventory = Array.from(existingInventoryMap.values());

        // Update the inventory in the database
        storeBoxPromise = StoreBoxes.findByIdAndUpdate(
          storeBoxInventory._id,
          {
            inventory: updatedInventory,
          },
          { new: true }, // Return updated document
        )
          .lean()
          .populate("inventory.box");
      } else {
        const newStoreBoxInventory = new StoreBoxes({
          store: doesBoxOrderExists.store,
          inventory: doesBoxOrderExists.orderItems,
        });
        storeBoxPromise = newStoreBoxInventory
          .save()
          .then((savedDocument) => savedDocument.populate("inventory.box"))
          .then((populatedDocument) => {
            return populatedDocument;
          })
          .catch((error) => {
            logger(
              "error",
              "Error saving or populating store box inventory:",
              error,
            );
            throw error;
          });
      }
      const storeBoxInventoryUpdate = await storeBoxPromise;

      await Promise.all([
        StoreBoxOrders.findByIdAndUpdate(doesBoxOrderExists._id, {
          status: "delivered",
        }),
        updateShopify({
          storeId: store._id,
          accessToken: store.accessToken,
          inventory: storeBoxInventoryUpdate.inventory,
          storeUrl: store.storeUrl,
        }),
      ]);
    }

    return {
      message: "successfully approved and updated the store box inventory",
      status: 200,
      data: null,
    };
  } catch (e) {
    console.log(e);
    return {
      message: e,
      status: 500,
    };
  }
};

const updateShopify = async ({ storeId, accessToken, storeUrl, inventory }) => {
  for (const item of inventory) {
    if (item.shopify?.productId && item.shopify?.variantId) {
      let isPackagingVariantAvailable;
      try {
        isPackagingVariantAvailable = await executeShopifyQueries({
          accessToken: accessToken,
          callback: (result) => {
            return result?.data?.product?.variants?.edges[0]?.node;
          },
          query: GET_PRODUCT_DETAILS,
          storeUrl,
          variables: {
            id: item.shopify.productId,
          },
        });

        logger("info", "Successfully fetched the packaging product");
      } catch (e) {
        logger("error", "[update-shopify] Could not fetch the box product", e);
        throw new Error(JSON.stringify(e));
      }

      let locations = [];
      let location;
      try {
        locations = await executeShopifyQueries({
          query: GET_STORE_LOCATION,
          accessToken,
          callback: (result) => result.data.locations.edges,
          storeUrl,
          variables: null,
        });
        logger("info", "Successfully fetched the store locations");
      } catch (e) {
        logger(
          "error",
          `[migrate-bundles-marketplace[create-store-product]] Could not get the location of the store`,
          e,
        );
        throw new Error(e);
      }
      if (locations.length) {
        const defaultLocation = locations.find(
          (l) => l.node.name === "Shop location",
        );
        if (!defaultLocation) {
          location = locations[0].node.id;
        } else {
          location = defaultLocation.node.id;
        }
      }
      if (isPackagingVariantAvailable) {
        const updateObj = {
          price: item.box.price,
          inventoryPolicy: "DENY",
          id: isPackagingVariantAvailable.id,
          inventoryItem: {
            tracked: true,
          },
        };

        try {
          await executeShopifyQueries({
            accessToken,
            callback: null,
            query: PRODUCT_VARIANT_BULK_UPDATE,
            storeUrl,
            variables: {
              productId: item.shopify?.productId,
              variants: [updateObj],
            },
          });
        } catch (e) {
          logger(
            "error",
            "Could not Update the product variant for packaging",
            e,
          );
        }

        try {
          await adjustShopifyInventory({
            variantIds: [isPackagingVariantAvailable.id],
            location,
            delta:
              item.remaining -
                Number(isPackagingVariantAvailable.inventoryQuantity) || 0,
            accessToken,
            storeUrl,
          });
        } catch (e) {
          logger("error", "Could not adjust the inventory item", e);
        }
      } else {
        // TODO : create the packaging variant with the current quantity
      }

      // fetch the product using shopifyId
      // update the variant
    } else {
      let product;
      let packagingVariant;
      try {
        product = await executeShopifyQueries({
          query: CREATE_PRODUCT_WITH_MEDIA,
          accessToken,
          callback: (result) => {
            const product = result.data?.productCreate?.product;
            packagingVariant = product.variants?.edges[0]?.node;
            return product;
          },
          storeUrl,
          variables: {
            input: {
              title: item.box.name,
              descriptionHtml:
                item.box.name || "Packaging generated through giftclub",
              tags: ["auto-generated", "giftclub", "packaging"],
              vendor: "giftclub",
              status: "DRAFT",
              productOptions: [
                {
                  name: BUNDLE_PACKAGING_NAMESPACE,
                  values: [
                    {
                      name: "default",
                    },
                  ],
                },
              ],
            },
            media: [],
          },
        });
        logger("info", "Successfully created the product on the store");
      } catch (e) {
        logger("error", `[update-shopify] Could not create store product`, e);
        throw new Error(e);
      }
      let locations = [];
      let location;
      try {
        locations = await executeShopifyQueries({
          query: GET_STORE_LOCATION,
          accessToken,
          callback: (result) => result.data.locations.edges,
          storeUrl,
          variables: null,
        });
        logger("info", "Successfully fetched the store locations");
      } catch (e) {
        logger(
          "error",
          `[migrate-bundles-marketplace[create-store-product]] Could not get the location of the store`,
          e,
        );
        throw new Error(e);
      }
      if (locations.length) {
        const defaultLocation = locations.find(
          (l) => l.node.name === "Shop location",
        );
        if (!defaultLocation) {
          location = locations[0].node.id;
        } else {
          location = defaultLocation.node.id;
        }
      }
      if (packagingVariant) {
        const updateObj = {
          price: item.box.price,
          inventoryPolicy: "DENY",
          id: packagingVariant.id,
          inventoryItem: {
            tracked: true,
          },
        };

        try {
          await executeShopifyQueries({
            accessToken,
            callback: null,
            query: PRODUCT_VARIANT_BULK_UPDATE,
            storeUrl,
            variables: {
              productId: product.id,
              variants: [updateObj],
            },
          });
          logger("info", "Successfully updated then product variant");
        } catch (e) {
          logger(
            "error",
            `[migrate-bundles-marketplace[create-store-product]] Could update the product's default variant`,
            e,
          );
          throw new Error(e);
        }
      }
      try {
        await adjustShopifyInventory({
          variantIds: [packagingVariant.id],
          location,
          delta: item.remaining,
          accessToken,
          storeUrl,
        });
      } catch (e) {
        logger("error", "Could not adjust the inventory item", e);
      }
      item.shopify = {
        productId: product.id,
        variantId: packagingVariant.id,
      };
      // create new shopify product.
      // update the variant with the inventory
    }
  }
  await StoreBoxes.findOneAndUpdate(
    {
      store: storeId,
    },
    {
      inventory,
    },
  );
};

const adjustShopifyInventory = async ({
  variantIds,
  delta,
  location,
  accessToken,
  storeUrl,
}) => {
  const variantInventoryVariables = {
    variantIds,
  };
  let inventoryUpdateObjs;
  try {
    inventoryUpdateObjs = await executeShopifyQueries({
      accessToken,
      callback: (result) => {
        return result?.data?.nodes.map((obj) => {
          return {
            delta,
            inventoryItemId: obj.inventoryItem.id,
            locationId: location,
          };
        });
      },
      query: GET_PRODUCT_VARIANTS_INVENTORY,
      storeUrl,
      variables: variantInventoryVariables,
    });
    logger("info", "Successfully fetched the inventory for the variants");
  } catch (e) {
    logger(
      "error",
      `[migrate-bundles-marketplace[create-store-product]] Could not get the  default variant inventory id`,
      e,
    );
    throw new Error(e);
  }

  try {
    const inventoryAdjustQuantitiesVariables = {
      input: {
        reason: "correction",
        name: "available",
        changes: inventoryUpdateObjs,
      },
    };

    await executeShopifyQueries({
      accessToken,
      callback: null,
      query: INVENTORY_ADJUST_QUANTITIES,
      storeUrl,
      variables: inventoryAdjustQuantitiesVariables,
    });
    logger("info", "Successfully updated inventory for the default variant");
  } catch (e) {
    logger(
      "error",
      `[migrate-bundles-marketplace[create-store-product]] Could adjust the inventory quantities`,
      e,
    );
    throw new Error(e);
  }
};
