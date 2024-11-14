import NodeSentry from "@sentry/node";
import dotenv from "dotenv";

dotenv.config();
// const logger = require("../logger");

// logger("info",typeof logger, Object.keys(logger))
// logger("info", `SENTRY: ${process.env.SENTRY_DSN}`);
NodeSentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

export default {
  error: (err) => {
    if (!err) NodeSentry.captureMessage("Sentry.Got.Empty.Error!");
    try {
      if (err.status && err.message) {
        NodeSentry.captureMessage(`${err.status}: ${err.message}`);
      } else {
        NodeSentry.captureException(err);
      }
    } catch (e) {
      // Do nothing
    }
  },
  info: (msg) => {
    NodeSentry.captureMessage(msg);
  },
};
