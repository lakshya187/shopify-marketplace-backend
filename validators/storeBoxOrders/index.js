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
    "any.only":
      "Status must be one of 'delivered', 'pending', 'cancelled', or 'in-progress'.",
    "string.empty": "Status cannot be empty.",
    "any.required": "Status is required.",
  }),
});
