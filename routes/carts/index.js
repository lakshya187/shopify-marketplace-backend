import { Router } from "express";

import ErrorResponseHandler from "#common-functions/utils/errorResponseHandler.js";
import SuccessResponseHandler from "#common-functions/utils/successResponseHandler.js";
import { CREATE_OR_UPDATE_CART } from "#constants/routes/carts/index.js";
import { CreateCart } from "#controllers/carts/index.js";

const CartsRoutes = Router();

export default () => {
  CartsRoutes.post(CREATE_OR_UPDATE_CART, async (req, res) => {
    try {
      const data = await CreateCart(req);

      return SuccessResponseHandler(req, res, {
        status: data.status || 200,
        message: data.message || "Success",
        data: data.data,
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

  return CartsRoutes;
};
