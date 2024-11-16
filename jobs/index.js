import logger from "#common-functions/logger/index.js";
import BundleCreationCron from "./store/createStoreBundles.js";

const StartJobs = () => {
  logger("info", "Starting CRONS");
  BundleCreationCron();
};

export default StartJobs;
