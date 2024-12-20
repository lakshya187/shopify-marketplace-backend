import Joi from "joi";
export const validateInitializeStore = Joi.object({
  storeUrl: Joi.string().required(),
  clientId: Joi.string().required(),
  clientSecret: Joi.string().required(),
});
