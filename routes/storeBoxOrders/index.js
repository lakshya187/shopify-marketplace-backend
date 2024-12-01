import { Router } from "express";

import ErrorResponseHandler from "#common-functions/utils/errorResponseHandler.js";
import SuccessResponseHandler from "#common-functions/utils/successResponseHandler.js";

import AuthMiddleware from "../../middlewares/authentication.js";
import {
  CreateStoreBoxOrder,
  GetAllBoxOrders,
  UpdateStoreBoxOrder,
} from "#controllers/storeBoxOrders/index.js";
import {
  CREATE_BOX_ORDER,
  GET_ALL_BOX_ORDERS,
  UPDATE_ORDER_STATUS,
} from "#constants/routes/storeBoxOrders/index.js";
import ValidateMiddleware from "../../validators/index.js";
import {
  CreateStoreBoxOrderSchema,
  UpdateStoreBoxOrderBodySchema,
} from "#validators/storeBoxOrders/index.js";

const StoreBoxOrderRoutes = Router();
export default () => {
  StoreBoxOrderRoutes.post(
    GET_ALL_BOX_ORDERS,
    AuthMiddleware,
    ValidateMiddleware(CreateStoreBoxOrderSchema),
    async (req, res) => {
      try {
        const data = await CreateStoreBoxOrder(req);

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

  StoreBoxOrderRoutes.get(
    CREATE_BOX_ORDER,
    AuthMiddleware,
    async (req, res) => {
      try {
        const data = await GetAllBoxOrders(req);

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

  StoreBoxOrderRoutes.patch(
    UPDATE_ORDER_STATUS,
    AuthMiddleware,
    ValidateMiddleware(UpdateStoreBoxOrderBodySchema),
    async (req, res) => {
      try {
        const data = await UpdateStoreBoxOrder(req);

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

  return StoreBoxOrderRoutes;
};
