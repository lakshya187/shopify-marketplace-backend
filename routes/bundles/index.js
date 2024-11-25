import { Router } from "express";
import logger from "#common-functions/logger/index.js";
import ErrorResponseHandler from "#common-functions/utils/errorResponseHandler.js";
import SuccessResponseHandler from "#common-functions/utils/successResponseHandler.js";
import {
  CREATE_BUNDLE,
  GET_BUNDLES,
  GET_SINGLE_BUNDLE,
  DELETE_BUNDLE,
  GENERATE_UPLOAD_URL,
  GET_OVERVIEW,
} from "../../constants/routes/bundles/index.js";
import {
  CreateBundle,
  GetBundles,
  GetSingleBundle,
  DeleteSingleBundle,
  GenerateUploadUrl,
} from "../../controllers/bundles/index.js";
import AuthMiddleware from "../../middlewares/authentication.js";
import ValidateMiddleware from "../../validators/index.js";
import { validateCreateBundle } from "#validators/bundles/index.js";
const BundleRoutes = Router();

export default () => {
  BundleRoutes.post(
    CREATE_BUNDLE,
    AuthMiddleware,
    ValidateMiddleware(validateCreateBundle),
    async (req, res) => {
      try {
        const data = await CreateBundle(req);
        logger("info", `Bundle created successfully: ${data._id}`);
        return SuccessResponseHandler(req, res, {
          status: data.status,
          message: data.message,
          data: data.data,
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

  BundleRoutes.post(GENERATE_UPLOAD_URL, AuthMiddleware, async (req, res) => {
    try {
      const data = await GenerateUploadUrl(req);
      return SuccessResponseHandler(req, res, {
        status: data.status,
        message: data.message,
        data: data.data,
      });
    } catch (error) {
      logger("error", "Error when generating upload url", error);
      return ErrorResponseHandler(
        req,
        res,
        error.message || "Internal server error",
      );
    }
  });

  BundleRoutes.get("/overview", async (req, res) => {
    try {
      // const data = await GenerateUploadUrl(req);
      return SuccessResponseHandler(req, res, {
        status: data.status,
        message: data.message,
        data: data.data,
      });
    } catch (error) {
      logger("error", "Error when generating upload url", error);
      return ErrorResponseHandler(
        req,
        res,
        error.message || "Internal server error",
      );
    }
  });

  BundleRoutes.get(GET_OVERVIEW, async (req, res) => {
    try {
      const data = await GetOverview(req);
      return SuccessResponseHandler(req, res, {
        status: data.status,
        message: data.message,
        data: data.data,
      });
    } catch (error) {
      logger("error", "Error when generating upload url", error);
      return ErrorResponseHandler(
        req,
        res,
        error.message || "Internal server error",
      );
    }
  });

  return BundleRoutes;
};
