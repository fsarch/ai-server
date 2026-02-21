import Joi from 'joi';

export const STATIC_AUTH_CONFIG_VALIDATOR = Joi.object({
  type: Joi.string().valid('static').required(),
  secret: Joi.string().required(),
  users: Joi.array().items(
    Joi.object({
      id: Joi.string().required(),
      username: Joi.string().required(),
      password: Joi.string().required(),
    }),
  ),
});
