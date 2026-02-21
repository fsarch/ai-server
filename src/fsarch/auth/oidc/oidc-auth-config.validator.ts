import Joi from 'joi';

export const OIDC_AUTH_CONFIG_VALIDATOR = Joi.object({
  type: Joi.string().valid('oidc').required(),
  discovery_url: Joi.string().required(),
});
