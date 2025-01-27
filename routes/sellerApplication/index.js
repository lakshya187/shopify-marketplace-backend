import { Router } from "express";

import ErrorResponseHandler from "#common-functions/utils/errorResponseHandler.js";
import SuccessResponseHandler from "#common-functions/utils/successResponseHandler.js";

import { CreateSellerApplication } from "#controllers/sellerApplication/index.js";
import { CREATE_SELLER_APPLICATION } from "#constants/routes/sellerApplication/index.js";
import ValidateMiddleware from "../../validators/index.js";
import { SellerApplicationCreateValidation } from "#validators/sellerApplication/index.js";
const SellerApplicationRoutes = Router();

export default () => {
  SellerApplicationRoutes.post(
    CREATE_SELLER_APPLICATION,
    ValidateMiddleware(SellerApplicationCreateValidation),
    async (req, res) => {
      try {
        const data = await CreateSellerApplication(req);

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

  return SellerApplicationRoutes;
};
