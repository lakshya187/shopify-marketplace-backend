import { Router } from "express";

import ErrorResponseHandler from "#common-functions/utils/errorResponseHandler.js";
import SuccessResponseHandler from "#common-functions/utils/successResponseHandler.js";
import ValidateMiddleware from "../../validators/index.js";

import AuthMiddleware from "../../middlewares/authentication.js";
import { GetStoreBoxInventory } from "#controllers/storeBoxes/index.js";
import {
  GET_ALL_TICKETS,
  CREATE_TICKET,
} from "#constants/routes/supportTickets/index.js";
import {
  CreateSupportTicket,
  GetSupportTickets,
} from "#controllers/supportTickets/index.js";
import { CreateSupportTicketSchema } from "#validators/supportTickets/index.js";
const SupportTicketRoutes = Router();
export default () => {
  SupportTicketRoutes.get(GET_ALL_TICKETS, AuthMiddleware, async (req, res) => {
    try {
      const data = await GetSupportTickets(req);
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
  // createSupportTicketSchema;
  SupportTicketRoutes.post(
    CREATE_TICKET,
    AuthMiddleware,
    ValidateMiddleware(CreateSupportTicketSchema),
    async (req, res) => {
      try {
        const data = await CreateSupportTicket(req);

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

  return SupportTicketRoutes;
};
