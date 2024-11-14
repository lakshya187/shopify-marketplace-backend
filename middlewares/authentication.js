import logger from "#common-functions/logger/index.js";
import ErrorResponseHandler from "#common-functions/utils/errorResponseHandler.js";
import { DecryptJWT } from "#utils/auth.js";

export default async function AuthMiddleware(req, res, next) {
  try {
    const { authorization } = req.headers;

    if (!authorization) {
      return ErrorResponseHandler(req, res, {
        status: 401,
        message: "Unauthorized",
      });
    }

    const token = authorization.split(" ")[1];

    if (!token || token === "null") {
      return ErrorResponseHandler(req, res, {
        status: 401,
        message: "Unauthorized",
      });
    }

    const decoded = await DecryptJWT(token);

    req.user = decoded;

    next();
  } catch (error) {
    logger("error", `AuthMiddleware - ${error}`);
    return ErrorResponseHandler(req, res, {
      status: error.status || 500,
      message: error.message || "Internal server error",
      error,
    });
  }
}
