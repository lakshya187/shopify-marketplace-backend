import Joi from "joi";
export const validateCreateBundle = Joi.object({
  name: Joi.string().min(3).required().messages({
    "string.base": "Name must be a string.",
    "string.empty": "Name is required.",
    "string.min": "Name must be at least 3 characters.",
    "any.required": "Name is required.",
  }),
  description: Joi.string().optional().messages({
    "string.base": "Description must be a string.",
  }),
  status: Joi.string().optional().messages({
    "string.base": "Status must be a string.",
  }),
  components: Joi.array().min(1).required().messages({
    "array.base": "Components must be an array.",
    "array.min": "Components must have at least one item.",
    "any.required": "Components are required.",
  }),
  price: Joi.number().positive().required().messages({
    "number.base": "Price must be a number.",
    "number.positive": "Price must be a positive number.",
    "any.required": "Price is required.",
  }),
  tags: Joi.array().items(Joi.string()).optional().messages({
    "array.base": "Tags must be an array of strings.",
    "string.base": "Each tag must be a string.",
  }),
  discount: Joi.number().min(0).optional().messages({
    "number.base": "Discount must be a number.",
    "number.min": "Discount cannot be less than 0.",
  }),

  isOnSale: Joi.boolean().optional().messages({
    "boolean.base": "IsOnSale must be a boolean value.",
  }),
  coverImage: Joi.required(),
  images: Joi.array().optional(),
  inventory: Joi.number().optional().messages({
    "number.base": "Inventory must be a number.",
  }),
  trackInventory: Joi.boolean().optional().messages({
    "boolean.base": "Track Inventory must be a boolean value.",
  }),
  category: Joi.string().optional().messages({
    "string.base": "Category must be a string.",
  }),
  box: Joi.string().required().messages({
    "string.base": "Box must be a string.",
    "any.required": "Box is required.",
  }),
  vendor: Joi.string().required().messages({
    "string.base": "Vendor must be a string.",
    "any.required": "Vendor is required.",
  }),
  sku: Joi.string().optional().messages({
    "string.base": "SKU must be a string.",
  }),
  compareAtPrice: Joi.optional(),
});

export const validateGenerateUrl = Joi.object({
  filename: Joi.string().required(),
  mimeType: Joi.string().required(),
  fileSize: Joi.string().required(),
});
