import { Router } from "express";
import logger from "#common-functions/logger/index.js";
import ErrorResponseHandler from "#common-functions/utils/errorResponseHandler.js";
import SuccessResponseHandler from "#common-functions/utils/successResponseHandler.js";

import AuthMiddleware from "../../middlewares/authentication.js";
import { HANDLE_CHAT } from "#constants/routes/chat/index.js";
import { ChatController } from "#controllers/chat/index.js";
const ChatRouters = Router();

export default () => {
  ChatRouters.post(HANDLE_CHAT, async (req, res) => {
    try {
      const data = await ChatController(req);

      return SuccessResponseHandler(req, res, {
        status: data.status,
        message: data.message,
        data: data.data,
      });
    } catch (error) {
      logger("error", "Error creating bundle", error);
      return ErrorResponseHandler(
        req,
        res,
        error.message || "Internal server error",
      );
    }
  });

  return ChatRouters;
};
