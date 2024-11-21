import { Router } from "express";

import ErrorResponseHandler from "#common-functions/utils/errorResponseHandler.js";
import SuccessResponseHandler from "#common-functions/utils/successResponseHandler.js";
import { PRODUCT_GET } from "#constants/routes/products/index.js";
import { GetProducts } from "../../controllers/products/index.js";
import AuthMiddleware from "../../middlewares/authentication.js";
const ProductRoutes = Router();
export default () => {
  ProductRoutes.get(PRODUCT_GET, AuthMiddleware, async (req, res) => {
    try {
      const data = await GetProducts(req);

      return SuccessResponseHandler(req, res, {
        status: data.status || 200,
        message: data.message || "Success",
        data: data.data?.data || [],
      });
    } catch (error) {
      console.log(error);
      return ErrorResponseHandler(
        req,
        res,
        error.status || 500,
        error.message || "Internal server error",
        error,
      );
    }
  });

  return ProductRoutes;
};
