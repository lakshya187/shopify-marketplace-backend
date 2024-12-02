import { Router } from "express";

import ErrorResponseHandler from "#common-functions/utils/errorResponseHandler.js";
import SuccessResponseHandler from "#common-functions/utils/successResponseHandler.js";
import AuthMiddleware from "../../middlewares/authentication.js";
import { CREATE_COUPON, GET_COUPONS } from "#constants/routes/coupons/index.js";
import { CreateCoupon, GetCoupons } from "#controllers/coupons/index.js";
import ValidateMiddleware from "../../validators/index.js";
import { CouponValidationSchema } from "#validators/coupons/index.js";

const CouponRoutes = Router();
CouponValidationSchema;
export default () => {
  CouponRoutes.post(
    CREATE_COUPON,
    AuthMiddleware,
    ValidateMiddleware(CouponValidationSchema),
    async (req, res) => {
      try {
        const data = await CreateCoupon(req);
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
    },
  );

  CouponRoutes.get(GET_COUPONS, AuthMiddleware, async (req, res) => {
    try {
      const data = await GetCoupons(req);

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

  return CouponRoutes;
};
