import { Router } from "express";

import ErrorResponseHandler from "#common-functions/utils/errorResponseHandler.js";
import SuccessResponseHandler from "#common-functions/utils/successResponseHandler.js";

import {
  CUSTOMER_DATA_ENSURE,
  CUSTOMER_DATA_SECURE,
  SHOP_DATA_ENSURE,
} from "#constants/routes/shopify/index.js";
const ShopifyRoutes = Router();
export default () => {
  ShopifyRoutes.post(CUSTOMER_DATA_ENSURE, async (req, res) => {
    try {
      return SuccessResponseHandler(req, res, {
        status: 200,
        message: "Success",
        data: [],
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
  ShopifyRoutes.post(CUSTOMER_DATA_SECURE, async (req, res) => {
    try {
      return SuccessResponseHandler(req, res, {
        status: 200,
        message: "Success",
        data: [],
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
  ShopifyRoutes.post(SHOP_DATA_ENSURE, async (req, res) => {
    try {
      return SuccessResponseHandler(req, res, {
        status: 200,
        message: "Success",
        data: [],
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

  return ShopifyRoutes;
};
