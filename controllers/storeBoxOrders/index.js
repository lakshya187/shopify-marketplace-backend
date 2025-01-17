import Stores from "#schemas/stores.js";
import StoreBoxes from "#schemas/storeBoxes.js";
import StoreBoxOrders from "#schemas/storeBoxOrders.js";
import logger from "#common-functions/logger/index.js";
import Bundles from "#schemas/bundles.js";
import executeShopifyQueries from "#common-functions/shopify/execute.js";
import {
  GET_PRODUCT_DETAILS,
  GET_PRODUCT_VARIANTS_INVENTORY,
  GET_STORE_LOCATION,
  INVENTORY_ADJUST_QUANTITIES,
  PRODUCT_VARIANT_BULK_UPDATE,
  PRODUCT_VARIANTS_CREATE,
} from "#common-functions/shopify/queries.js";

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
      if (storeBoxInventory) {
        const newInventory = doesBoxOrderExists.orderItems.map((orderItem) => {
          const isBoxAlreadyAvailable = storeBoxInventory.inventory.find(
            (b) => {
              return b.box._id.toString() === orderItem.box._id.toString();
            },
          );
          if (isBoxAlreadyAvailable) {
            isBoxAlreadyAvailable.quantity += orderItem.quantity;
            isBoxAlreadyAvailable.remaining += orderItem.quantity;
            return isBoxAlreadyAvailable;
          } else {
            return {
              box: orderItem.box._id,
              quantity: orderItem.quantity,
              remaining: orderItem.quantity,
              used: 0,
            };
          }
        });
        storeBoxPromise = StoreBoxes.findByIdAndUpdate(
          storeBoxInventory._id,
          {
            inventory: newInventory,
          },
          { new: true },
        )
          .lean()
          .populate("inventory.box");
      } else {
        storeBoxPromise = storeBoxInventory
          .save()
          .then((savedDocument) => savedDocument.populate("inventory.box"))
          .then((populatedDocument) => {
            return populatedDocument;
          })
          .catch((error) => {
            console.error(
              "Error saving or populating store box inventory:",
              error,
            );
            throw error;
          });
      }
      const storeBoxInventoryUpdate = await storeBoxPromise;
      await updateShopify({
        storeId: store._id,
        accessToken: marketplace.accessToken,
        inventory: storeBoxInventoryUpdate.inventory,
        storeUrl: marketplace.storeUrl,
      });
      // await Promise.all([
      //   StoreBoxOrders.findByIdAndUpdate(doesBoxOrderExists._id, {
      //     status: "delivered",
      //   }),
      // ]);
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
  // loop over the inventory, find the bundles which are associated with that packaging.
  // find the packaging variant
  // using the variant id, find the inventory item
  // update the inventory item.
  const PACKAGING_OPTION = "Packaging";
  const WITH_PACKAGING_OPTION = "With Packaging";
  await Promise.all([
    inventory.map(async (inventoryItem) => {
      const bundles = await Bundles.find({
        box: inventoryItem.box._id,
        store: storeId,
      }).lean();
      if (bundles.length) {
        for (const bundle of bundles) {
          let packagingVariant;
          if (bundle.shopifyProductId) {
            try {
              packagingVariant = await executeShopifyQueries({
                query: GET_PRODUCT_DETAILS,
                variables: {
                  id: bundle.shopifyProductId,
                },
                accessToken,

                callback: (result) => {
                  const product = result?.data?.product;
                  const variant = product?.variants?.edges.find(
                    ({ node }) => node.title === WITH_PACKAGING_OPTION,
                  );
                  return variant?.node;
                },
                storeUrl,
              });
              logger("info", "successfully fetched the bundle details");
            } catch (e) {
              logger(
                "error",
                "[update-store-box-order] Could not fetch bundle details",
              );
              throw new Error(
                "Could not fetch bundle details for " + bundle._id,
              );
            }
          }
          let locations;
          let location;
          try {
            locations = await executeShopifyQueries({
              accessToken,
              query: GET_STORE_LOCATION,
              storeUrl,
              callback: (result) => result.data.locations.edges,
            });
            logger("info", "Successfully fetched the store locations");
          } catch (e) {
            logger(
              "error",
              "[update-store-box-order] Could not fetch the store locations",
            );
          }
          const defaultLocation = locations.find(
            (l) => l.node.name === "Shop location",
          );
          if (!defaultLocation) {
            location = locations[0].node.id;
          } else {
            location = defaultLocation.node.id;
          }
          if (!packagingVariant) {
            try {
              packagingVariant = await executeShopifyQueries({
                accessToken,
                query: PRODUCT_VARIANTS_CREATE,
                storeUrl,
                variables: {
                  productId: bundle.shopifyProductId,
                  variants: [
                    {
                      optionValues: [
                        {
                          name: WITH_PACKAGING_OPTION,
                          optionName: PACKAGING_OPTION,
                        },
                      ],
                    },
                  ],
                },
                callback: (result) => {
                  return result.data.productVariantsBulkCreate.productVariants.find(
                    (item) => item.title === WITH_PACKAGING_OPTION,
                  );
                },
              });
              logger("info", "successfully added the packing variant.");
            } catch (e) {
              logger(
                "error",
                `[update-store-box-order] Could add the product packaging option`,
                e,
              );
              return;
            }
            let inventoryPolicy = "";
            if (bundle.trackInventory) {
              inventoryPolicy = "DENY";
            } else {
              inventoryPolicy = "CONTINUE";
            }
            try {
              await executeShopifyQueries({
                accessToken,
                callback: null,
                query: PRODUCT_VARIANT_BULK_UPDATE,
                storeUrl,
                variables: {
                  productId: bundle.shopifyProductId,
                  variants: [
                    {
                      id: packagingVariant.id,
                      compareAtPrice: bundle.compareAtPrice
                        ? Number(bundle.compareAtPrice) +
                          inventoryItem.box.price
                        : undefined,
                      price: bundle.price + inventoryItem.box.price,

                      inventoryItem: {
                        tracked: bundle.trackInventory,
                        sku: `${bundle.sku}_P`,
                      },
                      inventoryPolicy,
                    },
                  ],
                },
              });
              logger("info", "Successfully updated then product variant");
            } catch (e) {
              logger(
                "error",
                `[update-store-box-order] Could update the product's default variant`,
                e,
              );
              throw new Error(e);
            }
          }
          if (packagingVariant && packagingVariant.id) {
            let variantIdUpdateObj;
            try {
              variantIdUpdateObj = await executeShopifyQueries({
                accessToken,
                callback: (result) => {
                  return result?.data?.nodes.map((obj) => {
                    return {
                      delta: inventoryItem.remaining,
                      inventoryItemId: obj.inventoryItem.id,
                      locationId: location,
                    };
                  });
                },
                query: GET_PRODUCT_VARIANTS_INVENTORY,
                storeUrl,
                variables: {
                  variantIds: [packagingVariant.id],
                },
              });
            } catch (e) {
              logger(
                "error",
                "[update-store-box-order] Could not fetch the variant inventory",
                e,
              );
              throw Error(e);
            }
            try {
              const inventoryAdjustQuantitiesVariables = {
                input: {
                  reason: "correction",
                  name: "available",
                  changes: variantIdUpdateObj,
                },
              };

              await executeShopifyQueries({
                accessToken,
                callback: null,
                query: INVENTORY_ADJUST_QUANTITIES,
                storeUrl,
                variables: inventoryAdjustQuantitiesVariables,
              });
              logger(
                "info",
                "Successfully updated inventory for the default variant",
              );
            } catch (e) {
              logger(
                "error",
                `[update-store-box-order] Could adjust the inventory quantities`,
                e,
              );
              throw new Error(e);
            }
          }
        }
      }
    }),
  ]);
};
