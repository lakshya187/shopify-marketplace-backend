import mongoose from "mongoose";
import dotenv from "dotenv";
import logger from "#common-functions/logger/index.js";

dotenv.config();

mongoose.Promise = global.Promise;
mongoose.connection.on("error", (err) => {
  logger("error", err);
});

try {
  logger("info", `MONGO_URI: ${process.env.MONGO_URI}`);
  mongoose.connect(process.env.MONGO_URI, {
    socketTimeoutMS: 360000,
    connectTimeoutMS: 360000,
    readPreference: "primaryPreferred",
    ignoreUndefined: true,
  });
  // mongoose.set("debug", (...stuff) => {
  // 	mongoLogger.info(`${new Date().toLocaleString()}${JSON.stringify(stuff)}`);
  // });
} catch (err) {
  logger("error", err);
}

export default mongoose;
