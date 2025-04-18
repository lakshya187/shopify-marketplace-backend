import Joi from "joi";

export const CouponValidationSchema = Joi.object({
  code: Joi.string().trim().uppercase().required().messages({
    "string.base": "Code must be a string.",
    "string.empty": "Code cannot be empty.",
    "any.required": "Code is required.",
  }),
  title: Joi.string().required().messages({
    "string.base": "Title must be a string.",
    "string.empty": "Title cannot be empty.",
    "any.required": "Title is required.",
  }),
  discountValue: Joi.number().required().messages({
    "number.base": "Discount value must be a number.",
    "any.required": "Discount value is required.",
  }),
  discountType: Joi.string()
    .valid("percentage", "fixed_amount")
    .required()
    .messages({
      "string.base": "Discount type must be a string.",
      "any.only":
        "Discount type must be either 'percentage' or 'fixed_amount'.",
      "any.required": "Discount type is required.",
    }),
  appliesTo: Joi.string().valid("all", "products").required().messages({
    "string.base": "Applies to must be a string.",
    "any.only": "Applies to must be either 'all' or 'products'.",
    "any.required": "Applies to is required.",
  }),
  bundleIds: Joi.array()
    .items(Joi.string().regex(/^[0-9a-fA-F]{24}$/))
    .when("appliesTo", {
      is: "products",
      then: Joi.required(),
      otherwise: Joi.optional(),
    })
    .messages({
      "array.base": "Bundle IDs must be an array.",
      "string.pattern.base": "Each bundle ID must be a valid ObjectId.",
      "any.required": "Bundle IDs are required when appliesTo is 'products'.",
    }),
  usageLimit: Joi.number().optional(),
  appliesOncePerCustomer: Joi.boolean().default(false).messages({
    "boolean.base": "Applies once per customer must be a boolean.",
  }),
  startsAt: Joi.alternatives()
    .try(Joi.string().empty("").default(null), Joi.date().iso().optional())
    .messages({
      "date.base": "Starts at must be a valid date.",
      "date.format": "Starts at must be in ISO format.",
    }),
  endsAt: Joi.alternatives()
    .try(
      Joi.string().empty("").default(null),
      Joi.date().iso().greater(Joi.ref("startsAt")).optional(),
    )
    .messages({
      "date.base": "Ends at must be a valid date.",
      "date.format": "Ends at must be in ISO format.",
      "date.greater": "Ends at must be after Starts at.",
    }),
  isActive: Joi.boolean().default(true).messages({
    "boolean.base": "Is active must be a boolean.",
  }),
  purchaseType: Joi.string()
    .valid("oneTimePurchase", "subscription", "both")
    .default("oneTimePurchase")
    .messages({
      "string.base": "Purchase type must be a string.",
      "any.only":
        "Purchase type must be either 'oneTimePurchase', 'subscription', or 'both'.",
    }),
  minimumPurchaseAmount: Joi.alternatives()
    .try(Joi.string().empty("").default(null), Joi.number().positive())
    .messages({
      "number.base": "Minimum purchase amount must be a number.",
      "number.positive": "Minimum purchase amount must be a positive number.",
    }),
  maxNumberOfUse: Joi.number().optional().messages({
    "number.base": "Max number of use must be a number.",
  }),
  limitTheNumberOfUse: Joi.boolean().default(false).messages({
    "boolean.base": "Limit the number of use must be a boolean.",
  }),
  status: Joi.optional(),
});
