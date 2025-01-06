import Joi from "joi";

export const UpdateStoreSchema = Joi.object({
  businessName: Joi.string().trim().required().label("Business Name"),
  displayName: Joi.string().trim().required().label("Display Name"),
  description: Joi.string().trim().allow("").label("Description"),
  contactNumber: Joi.string()
    .pattern(/^[0-9]{10,15}$/)
    .allow(null)
    .label("Contact Number")
    .messages({
      "string.pattern.base":
        "Contact Number must be a valid phone number with 10 to 15 digits.",
    }),
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .label("Email"),
  addressLine1: Joi.string().optional(),
  addressLine2: Joi.string().optional(),
  landmark: Joi.string().optional(),
  pincode: Joi.string().optional(),
  state: Joi.string().optional(),
  gstNumber: Joi.string().optional(),
  // .messages({
  //   "string.pattern.base":
  //     "GST Number must be a valid 15-character alphanumeric string.",
  // }),
  registrationNumber: Joi.optional(),
  documents: Joi.array()
    .items(
      Joi.object({
        file: Joi.string().trim().required().label("Document File"),
        description: Joi.string()
          .trim()
          .allow("")
          .label("Document Description"),
      }),
    )
    .label("Documents"),
  logo: Joi.string().optional(),
});
