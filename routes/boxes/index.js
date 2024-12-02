import { GetAllBoxes } from "#controllers/boxes/index.js";

import { Router } from "express";

import ErrorResponseHandler from "#common-functions/utils/errorResponseHandler.js";
import SuccessResponseHandler from "#common-functions/utils/successResponseHandler.js";

import AuthMiddleware from "../../middlewares/authentication.js";
import { GET_ALL_BOXES } from "#constants/routes/boxes/index.js";

const BoxRoutes = Router();
export default () => {
  BoxRoutes.get(GET_ALL_BOXES, AuthMiddleware, async (req, res) => {
    try {
      const data = await GetAllBoxes(req);
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

  return BoxRoutes;
};
