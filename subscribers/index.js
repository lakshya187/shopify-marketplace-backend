import logger from "../common-functions/logger/index.js";
import productSyncHandler from "./products/syncProducts.js";
const StartSubscribers = () => {
  logger("info", "Starting the subscribers");
  productSyncHandler();
};

export default StartSubscribers;
