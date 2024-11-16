import subscriberService from "../../common-functions/redis/subscribe.js";
import logger from "../../common-functions/logger/index.js";
import GetProductStore from "../../services/shopify/getStoreProducts.service.js";
import CreaateProducts from "../../services/products/createProducts.js";
import stores from "../../schemas/stores.js";

const productSyncHandler = async (error, jobData, done) => {
  try {
    if (error) {
      logger("error", `Error in job processing: ${error.message}`);
      return done(error);
    }

    logger(
      "info",
      `Received ProductSync event with data: ${JSON.stringify(jobData)}`,
    );

    const { shopName, accessToken } = jobData;
    const store = await stores.find({ accessToken }).lean();
    const products = await GetProductStore({
      accessToken,
      shopName,
      numOfProducts: 10,
    });
    // dump the products in db
    // await CreaateProducts({ productsData: products, storeId: store._id });

    logger("info", "Product synchronization completed successfully");
    done();
  } catch (err) {
    logger("error", `Error while handling ProductSync: ${err.message}`);
    done(err);
  }
};

// Export the subscriber initialization
export default () => subscriberService("ProductSync", productSyncHandler);
