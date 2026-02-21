import Joi from 'joi';

export const CREATE_STATIC_UAC_CONFIG_VALIDATOR = (roles: string[]) =>
  Joi.object({
    type: Joi.string().valid('static').required(),
    users: Joi.array().items(
      Joi.object({
        user_id: Joi.string().required(),
        permissions: Joi.array()
          .items(
            Joi.string()
              .valid(...roles)
              .required(),
          )
          .required(),
      }),
    ),
  });
