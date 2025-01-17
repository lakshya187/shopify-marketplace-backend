import Joi from "joi";

export const CreateSupportTicketSchema = Joi.object({
  subject: Joi.string().optional(),
  query: Joi.string().optional(),
  contactNumber: Joi.string().optional(),
  contactName: Joi.string().required(),
  priority: Joi.string()
    .valid("low", "medium", "high", "urgent")
    .default("medium")
    .messages({
      "string.base": "Priority must be a string",
      "any.only":
        "Priority must be one of the following: low, medium, high, urgent",
    }),
  attachment: Joi.optional(),
});
