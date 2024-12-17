import { Router } from "express";
import ErrorResponseHandler from "#common-functions/utils/errorResponseHandler.js";
import SuccessResponseHandler from "#common-functions/utils/successResponseHandler.js";
import AuthMiddleware from "../../middlewares/authentication.js";
import {
  GET_STORE_DETAILS,
  UPDATE_STORE_DETAILS,
} from "#constants/routes/storeDetails/index.js";
import ValidateMiddleware from "../../validators/index.js";

import {
  GetStoreDetails,
  UpdateStoreDetails,
} from "#controllers/storeDetails/index.js";
import { UpdateStoreSchema } from "#validators/storeDetails/index.js";

const StoreDetailsRoutes = Router();

export default () => {
  StoreDetailsRoutes.get(
    GET_STORE_DETAILS,
    AuthMiddleware,
    async (req, res) => {
      try {
        const data = await GetStoreDetails(req);
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

  StoreDetailsRoutes.patch(
    UPDATE_STORE_DETAILS,
    AuthMiddleware,
    ValidateMiddleware(UpdateStoreSchema),
    async (req, res) => {
      try {
        const data = await UpdateStoreDetails(req);
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

  return StoreDetailsRoutes;
};
