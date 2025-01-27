import { Router } from "express";

import ErrorResponseHandler from "#common-functions/utils/errorResponseHandler.js";
import SuccessResponseHandler from "#common-functions/utils/successResponseHandler.js";

import AuthMiddleware from "../../middlewares/authentication.js";
import {
  GetStoreBoxInventory,
  GetStoreBoxInventoryWithStoreId,
} from "#controllers/storeBoxes/index.js";
import {
  GET_STORE_BOXES,
  GET_STORE_BOXES_STORE_ID,
} from "#constants/routes/storeBoxes/index.js";
const StoreBoxRoutes = Router();
export default () => {
  StoreBoxRoutes.get(GET_STORE_BOXES, AuthMiddleware, async (req, res) => {
    try {
      const data = await GetStoreBoxInventory(req);

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

  StoreBoxRoutes.get(GET_STORE_BOXES_STORE_ID, async (req, res) => {
    try {
      const data = await GetStoreBoxInventoryWithStoreId(req);

      return SuccessResponseHandler(req, res, {
        status: data.status || 200,
        message: data.message || "Success",
        data: data.data || [],
      });
    } catch (e) {
      return ErrorResponseHandler(
        req,
        res,
        error.status || 500,
        error.message || "Internal server error",
        error,
      );
    }
  });

  return StoreBoxRoutes;
};
