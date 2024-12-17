import { Router } from "express";
import logger from "#common-functions/logger/index.js";
import ErrorResponseHandler from "#common-functions/utils/errorResponseHandler.js";
import SuccessResponseHandler from "#common-functions/utils/successResponseHandler.js";
import { GENERATE_PRESIGNED_URL } from "../../constants/routes/media/index.js";

import AuthMiddleware from "../../middlewares/authentication.js";
import { GeneratePresignedUrl } from "#controllers/media/index.js";
const MediaRoutes = Router();

export default () => {
  MediaRoutes.post(GENERATE_PRESIGNED_URL, AuthMiddleware, async (req, res) => {
    try {
      const data = await GeneratePresignedUrl(req);

      return SuccessResponseHandler(req, res, {
        status: data.status,
        message: data.message,
        data: data.data,
      });
    } catch (error) {
      logger("error", "Error creating bundle", error);
      return ErrorResponseHandler(
        req,
        res,
        error.message || "Internal server error",
      );
    }
  });

  return MediaRoutes;
};
