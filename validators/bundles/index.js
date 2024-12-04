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
  status: Joi.string().max(500).optional().messages({
    "string.base": "Status must be a string.",
    "string.max": "Name cannot exceed 100 characters.",
  }),
  productIds: Joi.array().min(1).required(),
  price: Joi.number().positive().required().messages({
    "number.base": "Price must be a number.",
    "number.positive": "Price must be a positive number.",
    "any.required": "Price is required.",
  }),
  tags: Joi.array().items(Joi.string()).optional().messages({
    "array.base": "Tags must be an array of strings.",
  }),
  discount: Joi.number().min(0).optional().messages({
    "number.base": "Discount must be a number.",
    "number.min": "Discount cannot be less than 0.",
  }),
  metadata: Joi.object().optional().messages({
    "object.base": "Metadata must be an object.",
  }),
  costOfGoods: Joi.number().min(0).optional().messages({
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
  images: Joi.array().items(Joi.string()).messages({
    "array.base": "Images must be a string of array",
  }),
  inventory: Joi.number(),
  trackInventory: Joi.boolean(),
  category: Joi.string().optional(),
  box: Joi.string().required(),
});

export const validateGenerateUrl = Joi.object({
  filename: Joi.string().required(),
  mimeType: Joi.string().required(),
  fileSize: Joi.string().required(),
});
