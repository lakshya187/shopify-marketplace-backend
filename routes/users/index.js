import { Router } from "express";

import ErrorResponseHandler from "#common-functions/utils/errorResponseHandler.js";
import SuccessResponseHandler from "#common-functions/utils/successResponseHandler.js";
import {
  GET_USER_OVERVIEW,
  GET_USER_REPORT,
} from "#constants/routes/users/index.js";
import AuthMiddleware from "../../middlewares/authentication.js";
import {
  GetCustomerReport,
  GetUserOverview,
} from "#controllers/users/index.js";
const UserRoutes = Router();
export default () => {
  UserRoutes.get(GET_USER_REPORT, AuthMiddleware, async (req, res) => {
    try {
      const data = await GetCustomerReport(req);

      return SuccessResponseHandler(req, res, {
        status: data.status || 200,
        message: data.message || "Success",
        data: data?.data || [],
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
  UserRoutes.get(GET_USER_OVERVIEW, AuthMiddleware, async (req, res) => {
    try {
      const data = await GetUserOverview(req);
      return SuccessResponseHandler(req, res, {
        status: data.status || 200,
        message: data.message || "Success",
        data: data?.data || [],
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

  return UserRoutes;
};
