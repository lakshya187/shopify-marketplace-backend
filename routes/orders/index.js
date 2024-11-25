import { Router } from "express";
import logger from "#common-functions/logger/index.js";
import ErrorResponseHandler from "#common-functions/utils/errorResponseHandler.js";
import SuccessResponseHandler from "#common-functions/utils/successResponseHandler.js";
import {
  GET_ORDERS,
  GET_OVERVIEW,
} from "../../constants/routes/orders/index.js";
import {
  GetOrders,
  GetOrdersOverview,
} from "../../controllers/orders/index.js";
import AuthMiddleware from "../../middlewares/authentication.js";
const OrderRoutes = Router();

export default () => {
  OrderRoutes.get(GET_ORDERS, AuthMiddleware, async (req, res) => {
    try {
      const data = await GetOrders(req);
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

  OrderRoutes.get(GET_OVERVIEW, AuthMiddleware, async (req, res) => {
    try {
      const data = await GetOrdersOverview(req);
      return SuccessResponseHandler(req, res, {
        status: data.status,
        message: data.message,
        data: data.data,
      });
    } catch (e) {
      logger("error", "Error creating bundle", e);
      return ErrorResponseHandler(
        req,
        res,
        error.message || "Internal server error",
      );
    }
  });

  return OrderRoutes;
};
