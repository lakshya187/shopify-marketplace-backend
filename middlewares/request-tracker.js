import { randomUUID } from "crypto";
import logger from "../common-functions/logger/index.js";

export default (request, response, next) => {
  request.headers.requestid = randomUUID();

  const startTime = Date.now();
  const requestUrl = request.url;

  const requestPayload = {
    method: request.method,
    url: requestUrl,
    ip: request.headers["x-forwarded-for"] || request.ip,
    requestId: request.headers.requestid,
  };

  logger("info", `REQUEST :: ${request.method} ${requestUrl}`, requestPayload);

  response.on("finish", () => {
    logger("info", `RESPONSE :: ${request.method} ${requestUrl}`, {
      ...requestPayload,
      timeTaken: `${Date.now() - startTime}ms`,
      statusCode: response.statusCode,
    });
  });

  next();
};
