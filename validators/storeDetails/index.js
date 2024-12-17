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
  addressLine1: Joi.string().trim().allow(null, "").label("Address Line 1"),
  addressLine2: Joi.string().trim().allow(null, "").label("Address Line 2"),
  landmark: Joi.string().trim().allow("").label("Landmark"),
  pincode: Joi.string()
    .trim()
    .pattern(/^[0-9]{5,10}$/)
    .allow(null, "")
    .label("Pincode")
    .messages({
      "string.pattern.base":
        "Pincode must be a valid numeric string with 5 to 10 digits.",
    }),
  state: Joi.string().trim().allow("").label("State"),
  gstNumber: Joi.string()
    .trim()
    // .pattern(/^[A-Z0-9]{15}$/)
    .allow(null, "")
    .label("GST Number"),
  // .messages({
  //   "string.pattern.base":
  //     "GST Number must be a valid 15-character alphanumeric string.",
  // }),
  registrationNumber: Joi.string()
    .trim()
    .allow(null, "")
    .label("Registration Number"),
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
