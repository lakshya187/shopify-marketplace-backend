import { Router } from "express";

import ErrorResponseHandler from "#common-functions/utils/errorResponseHandler.js";
import SuccessResponseHandler from "#common-functions/utils/successResponseHandler.js";
import AuthMiddleware from "../../middlewares/authentication.js";
import { GET_CATEGORIES } from "#constants/routes/categories/index.js";
import { GetCategories } from "#controllers/categories/index.js";

const CategoriesRoutes = Router();

export default () => {
  CategoriesRoutes.get(GET_CATEGORIES, AuthMiddleware, async (req, res) => {
    try {
      const data = await GetCategories(req);

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

  return CategoriesRoutes;
};
