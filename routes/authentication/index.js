import ErrorResponseHandler from "#common-functions/utils/errorResponseHandler.js";
import SuccessResponseHandler from "#common-functions/utils/successResponseHandler.js";
import {
  SHOPIFY_AUTH_REDIRECT,
  SHOPIFY_AUTH_CALLBACK,
  LOGIN_FROM_TOKEN,
  LOGIN_FROM_PASSWORD,
  GET_PROFILE,
  INITIALIZE_APP,
} from "#constants/routes/authentications/index.js";
import { Router } from "express";
import {
  RedirectToShopifyAuth,
  ShopifyAuthCallback,
  LoginFromToken,
  LoginFromPassword,
  GetProfile,
  InitializeStore,
} from "#controllers/authentications/index.js";
import AuthMiddleware from "../../middlewares/authentication.js";
import { validateInitializeStore } from "#validators/authentications/index.js";
import ValidateMiddleware from "#validators/index.js";

const AuthRoutes = Router();

export default () => {
  AuthRoutes.get(SHOPIFY_AUTH_REDIRECT, async (req, res) => {
    try {
      const data = await RedirectToShopifyAuth(req);

      if (data.redirect) {
        return res.redirect(data.url);
      }

      return SuccessResponseHandler(req, res, {
        status: data.status || 200,
        message: data.message || "Success",
        data,
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

  AuthRoutes.get(SHOPIFY_AUTH_CALLBACK, async (req, res) => {
    try {
      const data = await ShopifyAuthCallback(req);

      if (data.redirect) {
        return res.redirect(data.url);
      }

      return SuccessResponseHandler(req, res, {
        status: data.status || 200,
        message: data.message || "Success",
        data,
      });
    } catch (error) {
      return ErrorResponseHandler(req, res, {
        status: error.status || 500,
        message: error.message || "Internal server error",
        error,
      });
    }
  });

  AuthRoutes.post(LOGIN_FROM_TOKEN, async (req, res) => {
    try {
      const data = await LoginFromToken(req);

      return SuccessResponseHandler(req, res, {
        status: data.status || 200,
        message: data.message || "Success",
        data,
      });
    } catch (error) {
      return ErrorResponseHandler(req, res, {
        status: error.status || 500,
        message: error.message || "Internal server error",
        error,
      });
    }
  });

  AuthRoutes.post(LOGIN_FROM_PASSWORD, async (req, res) => {
    try {
      const data = await LoginFromPassword(req);

      return SuccessResponseHandler(req, res, {
        status: data.status || 200,
        message: data.message || "Success",
        data,
      });
    } catch (error) {
      return ErrorResponseHandler(req, res, {
        status: error.status || 500,
        message: error.message || "Internal server error",
        error,
      });
    }
  });

  AuthRoutes.get(GET_PROFILE, AuthMiddleware, async (req, res) => {
    try {
      const data = await GetProfile(req);

      return SuccessResponseHandler(req, res, {
        status: 200,
        message: "Success",
        data,
      });
    } catch (error) {
      return ErrorResponseHandler(req, res, {
        status: error.status || 500,
        message: error.message || "Internal server error",
        error,
      });
    }
  });

  AuthRoutes.post(
    INITIALIZE_APP,
    ValidateMiddleware(validateInitializeStore),
    async (req, res) => {
      try {
        const data = await InitializeStore(req);
        return SuccessResponseHandler(req, res, {
          status: data.status,
          message: data.message,
          data: data.result ?? null,
        });
      } catch (error) {
        return ErrorResponseHandler(req, res, {
          status: error.status || 500,
          message: error.message || "Internal server error",
          error,
        });
      }
    },
  );

  return AuthRoutes;
};
