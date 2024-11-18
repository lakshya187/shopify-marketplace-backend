import Joi from "joi";
import ErrorResponseHandler from "#common-functions/utils/errorResponseHandler.js";

const validateCreateBundle = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().min(3).max(100).required().messages({
      "string.base": "Name must be a string.",
      "string.empty": "Name is required.",
      "string.min": "Name must be at least 3 characters.",
      "string.max": "Name cannot exceed 100 characters.",
      "any.required": "Name is required.",
    }),
    description: Joi.string().max(500).optional().messages({
      "string.base": "Description must be a string.",
      "string.max": "Description cannot exceed 500 characters.",
    }),
    product_ids: Joi.array()
      .items(Joi.string().required())
      .min(1)
      .required()
      .messages({
        "array.base": "Product IDs must be an array of strings.",
        "array.min": "At least one product ID is required.",
        "any.required": "Product IDs are required.",
      }),
    price: Joi.number().positive().required().messages({
      "number.base": "Price must be a number.",
      "number.positive": "Price must be a positive number.",
      "any.required": "Price is required.",
    }),
    tags: Joi.array().items(Joi.string()).optional().messages({
      "array.base": "Tags must be an array of strings.",
    }),
    discount: Joi.number().min(0).max(100).optional().messages({
      "number.base": "Discount must be a number.",
      "number.min": "Discount cannot be less than 0.",
      "number.max": "Discount cannot exceed 100.",
    }),
    metadata: Joi.object().optional().messages({
      "object.base": "Metadata must be an object.",
    }),
  });

  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    const errors = error.details.map((detail) => detail.message);
    return ErrorResponseHandler(req, res, errors);
  }

  next();
};

export { validateCreateBundle };
