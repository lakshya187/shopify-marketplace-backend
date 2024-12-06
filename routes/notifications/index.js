import { Router } from "express";

import ErrorResponseHandler from "#common-functions/utils/errorResponseHandler.js";
import SuccessResponseHandler from "#common-functions/utils/successResponseHandler.js";

import AuthMiddleware from "../../middlewares/authentication.js";
import {
  GET_ALL_NOTIFICATIONS,
  UPDATE_NOTIFICATION,
} from "#constants/routes/notifications/index.js";
import {
  GetNotifications,
  UpdateNotification,
} from "#controllers/notifications/index.js";

const NotificationRoutes = Router();
export default () => {
  NotificationRoutes.get(
    GET_ALL_NOTIFICATIONS,
    AuthMiddleware,
    async (req, res) => {
      try {
        const data = await GetNotifications(req);
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

  NotificationRoutes.patch(
    UPDATE_NOTIFICATION,
    AuthMiddleware,
    async (req, res) => {
      try {
        const data = await UpdateNotification(req);

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

  return NotificationRoutes;
};
