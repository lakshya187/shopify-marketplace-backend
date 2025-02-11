import { Router } from "express";
import ErrorResponseHandler from "#common-functions/utils/errorResponseHandler.js";
import SuccessResponseHandler from "#common-functions/utils/successResponseHandler.js";
import AuthMiddleware from "../../middlewares/authentication.js";
import {
  GET_STORE_DETAILS,
  UPDATE_STORE_DETAILS,
} from "#constants/routes/stores/index.js";
import ValidateMiddleware from "../../validators/index.js";

import { GetStore, UpdateStore } from "#controllers/stores/index.js";
import { UpdateStoreSchema } from "#validators/stores/index.js";

const StoreRoutes = Router();

export default () => {
  StoreRoutes.get(GET_STORE_DETAILS, AuthMiddleware, async (req, res) => {
    try {
      const data = await GetStore(req);
      return SuccessResponseHandler(req, res, {
        status: data.status || 200,
        message: data.message || "Success",
        data: data.data || [],
      });
    } catch (error) {
      return ErrorResponseHandler(
        req,
        res,
        error.status || 500,
        error.message || "Internal server error",
        error,
      );
    }
  });

  StoreRoutes.patch(
    UPDATE_STORE_DETAILS,
    AuthMiddleware,
    ValidateMiddleware(UpdateStoreSchema),
    async (req, res) => {
      try {
        const data = await UpdateStore(req);
        return SuccessResponseHandler(req, res, {
          status: data.status || 200,
          message: data.message || "Success",
          data: data.data || [],
        });
      } catch (error) {
        return ErrorResponseHandler(
          req,
          res,
          error.status || 500,
          error.message || "Internal server error",
          error,
        );
      }
    },
  );

  return StoreRoutes;
};
