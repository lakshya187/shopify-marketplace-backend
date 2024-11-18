import { Router } from "express";
import logger from "#common-functions/logger/index.js";
import ErrorResponseHandler from "#common-functions/utils/errorResponseHandler.js";
import SuccessResponseHandler from "#common-functions/utils/successResponseHandler.js";
import {
  CREATE_BUNDLE,
  GET_BUNDLES,
  GET_SINGLE_BUNDLE,
  DELETE_BUNDLE,
} from "../../constants/routes/bundles/index.js";
import {
  CreateBundle,
  GetBundles,
  GetSingleBundle,
  DeleteSingleBundle,
} from "../../controllers/bundles/index.js";
import { validateCreateBundle } from "../../middlewares/validate/bundleValidators.js";
import AuthMiddleware from "../../middlewares/authentication.js";
const BundleRoutes = Router();

export default () => {
  BundleRoutes.post(
    CREATE_BUNDLE,
    AuthMiddleware,
    validateCreateBundle,
    async (req, res) => {
      try {
        const savedBundle = await CreateBundle(req);
        logger("info", `Bundle created successfully: ${savedBundle._id}`);
        return SuccessResponseHandler(req, res, {
          status: savedBundle.status,
          message: savedBundle.message,
          data: savedBundle.data,
        });
      } catch (error) {
        // Log and send an error response
        logger("error", "Error creating bundle", error);
        return ErrorResponseHandler(
          req,
          res,
          error.message || "Internal server error",
        );
      }
    },
  );

  BundleRoutes.get(GET_BUNDLES, AuthMiddleware, async (req, res) => {
    try {
      const data = await GetBundles(req);
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

  BundleRoutes.get(GET_SINGLE_BUNDLE, AuthMiddleware, async (req, res) => {
    try {
      const data = await GetSingleBundle(req);
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

  BundleRoutes.delete(DELETE_BUNDLE, AuthMiddleware, async (req, res) => {
    try {
      const data = await DeleteSingleBundle(req);
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

  return BundleRoutes;
};
