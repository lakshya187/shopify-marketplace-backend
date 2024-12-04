import Joi from "joi";

export const CreateStoreBoxOrderSchema = Joi.object({
  orderItems: Joi.array()
    .items(
      Joi.object({
        box: Joi.string()
          .regex(/^[0-9a-fA-F]{24}$/)
          .required()
          .messages({
            "any.required":
              "Each order item must include a valid packaging ID.",
            "string.pattern.base": "Invalid box ID format.",
          }),
        quantity: Joi.number().integer().positive().required().messages({
          "any.required": "Each order item must include a quantity.",
          "number.positive": "Quantity must be greater than 0.",
          "number.base": "Quantity must be a number.",
        }),
      }),
    )
    .min(1)
    .required()
    .messages({
      "array.min": "At least one order item is required.",
      "any.required": "Order items are required.",
    }),
});

export const UpdateStoreBoxOrderBodySchema = Joi.object({
  status: Joi.string().valid("delivered", "cancelled").required().messages({
    "string.base": "Status must be a string.",
    "any.only": "Status must be one of 'delivered' or 'cancelled'.",
    "string.empty": "Status cannot be empty.",
    "any.required": "Status is required.",
  }),
  id: Joi.string().required().messages({
    "string.base": "Id must be a string.",
    "string.empty": "Id cannot be empty.",
    "any.required": "Id is required.",
  }),
});
