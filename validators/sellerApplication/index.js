import Joi from "joi";

export const SellerApplicationCreateValidation = Joi.object({
  fullName: Joi.string().required(),
  email: Joi.string()
    .email({ tlds: { allow: true } }) // Validates email format
    .required(),
  brandName: Joi.string().required(),
  storeLink: Joi.string()
    .pattern(
      /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/.*)?$/, // Matches domain-like patterns and full URLs
    )
    .message("Invalid store link. Please provide a valid URL.") // Custom error message
    .required(),
});
