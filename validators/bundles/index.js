import Joi from "joi";
export const validateCreateBundle = Joi.object({
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
  productIds: Joi.array()
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
  costOfGoods: Joi.number().min(0).max(100).optional().messages({
    "number.base": "Cost must be a number.",
    "number.min": "Cost cannot be less than 0.",
  }),
  isOnSale: Joi.boolean().optional(),
  height: Joi.number().optional({
    "number.base": "Height must be a number.",
    "number.min": "Height cannot be less than 0.",
  }),
  width: Joi.number().optional({
    "number.base": "Width must be a number.",
    "number.min": "Width cannot be less than 0.",
  }),
  length: Joi.number().optional({
    "number.base": "Length must be a number.",
    "number.min": "Length cannot be less than 0.",
  }),
  weight: Joi.number().optional({
    "number.base": "Weight must be a number.",
    "number.min": "Weight cannot be less than 0.",
  }),
  coverImage: Joi.string().uri().optional().messages({
    "string.base": "Cover Image must be a string.",
    "string.empty": "Cover Image is required.",
    "string.uri": "Cover Image must be a valid URL.",
  }),
  images: Joi.array().items(
    Joi.object({
      src: Joi.string().uri().required().messages({
        "string.base": "Image source must be a string.",
        "string.uri": "Image source must be a valid URL.",
        "any.required": "Image source is required.",
      }),
      altText: Joi.string().optional().messages({
        "string.base": "Alt Text must be a string.",
      }),
    }),
  ),
});
