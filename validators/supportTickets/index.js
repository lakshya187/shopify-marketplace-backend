import Joi from "joi";

export const CreateSupportTicketSchema = Joi.object({
  subject: Joi.string().required().min(5).max(255).messages({
    "string.base": "Subject must be a string",
    "string.empty": "Subject is required",
    "string.min": "Subject must be at least 5 characters long",
    "string.max": "Subject must not exceed 255 characters",
  }),
  query: Joi.string().required().min(10).messages({
    "string.base": "Query must be a string",
    "string.empty": "Query is required",
    "string.min": "Query must be at least 10 characters long",
  }),
  priority: Joi.string()
    .valid("low", "medium", "high", "urgent")
    .default("medium")
    .messages({
      "string.base": "Priority must be a string",
      "any.only":
        "Priority must be one of the following: low, medium, high, urgent",
    }),
});
