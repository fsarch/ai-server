import Joi from 'joi';

export const JWT_JWK_AUTH_CONFIG_VALIDATOR = Joi.object({
  type: Joi.string().valid('jwt-jwk').required(),
  jwkUrl: Joi.string().required(),
  discovery_url: Joi.string().optional(),
});
