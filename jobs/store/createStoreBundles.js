import cron from "node-cron";
import subscriberService from "../../common-functions/redis/subscribe.js";
import logger from "../../common-functions/logger/index.js";
import GetProductStore from "../../services/shopify/getStoreProducts.service.js";
import stores from "../../schemas/stores.js";
import { BUNDLE_CREATION_STATUSES } from "./enums.js";
import GetStoreOrders from "../../services/shopify/getStoreOrders.service.js";
import bundle from "../../schemas/bundles.js";

const CreateBundles = async () => {
  try {
    const storesWithoutBundle = await stores
      .find({
        bundleCreation: BUNDLE_CREATION_STATUSES.PENDING,
      })
      .lean();

    if (storesWithoutBundle?.length) {
      // Using Promise.allSettled to process all stores
      const bundlePromises = await Promise.allSettled(
        storesWithoutBundle.map(async (store) => {
          try {
            const lastTenOrders = await GetStoreOrders({
              shopName: store.shopName,
              accessToken: store.accessToken,
              numOfOrders: 10,
            });

            // Check if fetching orders was successful
            if (!lastTenOrders.success) {
              logger(
                "error",
                `Failed to fetch orders for store ${store.shopName}`,
              );
              return;
            }

            const productIds = [];
            let totalPrice = 0;

            lastTenOrders.data.forEach((order) => {
              order.lineItems.forEach((lineItem) => {
                productIds.push(lineItem.id); // Extract product IDs
                if (lineItem.unitPrice) {
                  totalPrice +=
                    parseFloat(lineItem.unitPrice) * lineItem.quantity; // Calculate total price
                }
              });
            });

            if (productIds.length === 0) {
              logger(
                "warn",
                `No products found in orders for store ${store.shopName}`,
              );
              return;
            }

            // Create a bundle document
            const bundleObj = new bundle({
              name: `Bundle for ${store.shopName}`,
              description: "Automatically generated bundle from recent orders.",
              product_ids: productIds,
              store: store._id,
              price: totalPrice,
              status: "draft", // Default status
              tags: ["auto-generated", "recent-orders"], // Example tags
              metadata: {
                generatedBy: "CreateBundles script",
                generatedAt: new Date(),
              },
            });

            // Save to the database
            await bundleObj.save();

            await stores.updateOne(
              { _id: store._id },
              {
                $set: { bundleCreation: "active" },
              },
            );

            logger(
              "info",
              `Bundle created successfully for store ${store.shopName}`,
            );
          } catch (error) {
            logger(
              "error",
              `Error processing bundle for store ${store.shopName}: ${error.message}`,
            );
          }
        }),
      );

      // Log any failed operations for further analysis
      const failedPromises = bundlePromises.filter(
        (p) => p.status === "rejected",
      );
      if (failedPromises.length > 0) {
        logger(
          "error",
          `${failedPromises.length} bundle creation operations failed.`,
          failedPromises,
        );
      }

      logger("info", "Completed processing bundles for pending stores.");
    }
  } catch (err) {
    logger("error", `Error in CreateBundles: ${err.message}`);
  }
};

// Cron job that runs every minute

export default () => {
  cron.schedule("0/10 * * * * *", async () => {
    logger("info", "Running CreateBundles cron job...");
    await CreateBundles();
  });
};
// Export the cron job initialization (optional)
