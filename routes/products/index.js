import { Router } from "express";

import ErrorResponseHandler from "#common-functions/utils/errorResponseHandler.js";
import SuccessResponseHandler from "#common-functions/utils/successResponseHandler.js";
import { PRODUCT_GET } from "#constants/routes/products/index.js";
import { GetProducts } from "../../controllers/products/index.js";
import AuthMiddleware from "../../middlewares/authentication.js";
const AuthRoutes = Router();
export default () => {
  AuthRoutes.get(PRODUCT_GET, AuthMiddleware, async (req, res) => {
    try {
      const data = await GetProducts(req);

      return SuccessResponseHandler(req, res, {
        status: data.status || 200,
        message: data.message || "Success",
        data,
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
  // appRouter.post(PRODUCT_CREATE, AuthMiddleware, async (req, res) => {
  //   try {
  //     const data = await CreateProductsStore(req);
  //     return SuccessResponseHandler(req, res, {
  //       status: data.status || 201,
  //       message: data.message || "Success",
  //       data,
  //     });
  //   } catch (e) {
  //     console.error(e);
  //     return ErrorResponseHandler(
  //       req,
  //       res,
  //       error.status || 500,
  //       error.message || "Internal server error",
  //       error,
  //     );
  //   }
  // });

  return AuthRoutes;
};
