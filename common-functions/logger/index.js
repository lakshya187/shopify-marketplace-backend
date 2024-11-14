/* eslint-disable default-param-last */

import dotenv from "dotenv";
import WINSTON from "winston";
import Sentry from "../sentry/index.js";
import ConsoleTransport from "./consoleTransport.js";
import LogglyTransport from "./logglyTransport.js";

dotenv.config();

const transports = [];
if (process.env.ENABLE_CONSOLE_LOGS === "true") {
  transports.push(new ConsoleTransport());
}
if (process.env.ENABLE_LOGGLY === "true") {
  transports.push(
    new LogglyTransport({
      token: process.env.LOGGLY_TOKEN,
      subdomain: process.env.LOGGLY_SUBDOMAIN,
      tags: process.env.LOGGLY_TAGS
        ? process.env.LOGGLY_TAGS.split("::::")
        : [],
      json: true,
    }),
  );
}

const winstonLogger = WINSTON.createLogger({
  level: "info",
  format: WINSTON.format.json(),
  transports,
});

const logger = (logLevel = "info", message, metadata = {}, sentry = false) => {
  winstonLogger.log(logLevel, message, {
    ...metadata,
    timestamp: new Date(),
  });
  if (logLevel === "error") {
    Sentry.error(message);
  } else if (logLevel === "info" && sentry) {
    Sentry.info(message);
  }
};

logger("info", "Logger initiated");

export default logger;
