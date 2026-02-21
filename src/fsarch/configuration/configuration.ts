import { readFileSync } from 'fs';
import * as yaml from 'js-yaml';
import { resolve } from 'node:path';
import Joi from 'joi';
import { ConfigType } from './config.type.js';

const YAML_CONFIG_FILENAME = 'config.yaml';

const CONFIG_VALIDATION_SCHEMA = Joi
  .any
  //{
  // auth: Joi.alternatives(
  //   Joi.object({
  //     type: Joi.string().valid('static').required(),
  //     secret: Joi.string().required(),
  //     users: Joi.array().items(
  //       Joi.object({
  //         id: Joi.string().required(),
  //         username: Joi.string().required(),
  //         password: Joi.string().required(),
  //       }),
  //     ),
  //   }),
  // ),
  // uac: Joi.alternatives(
  //   Joi.object({
  //     type: Joi.string().valid('static').required(),
  //     users: Joi.array().items(
  //       Joi.object({
  //         user_id: Joi.string().required(),
  //         permissions: Joi.array()
  //           .items(Joi.string().valid('manage_images').required())
  //           .required(),
  //       }),
  //     ),
  //   }),
  // ),
  // database: Joi.alternatives().try(
  //   Joi.object({
  //     type: Joi.string().valid('sqlite').required(),
  //     database: Joi.string().required(),
  //   }),
  //   Joi.object({
  //     type: Joi.string().valid('cockroachdb').required(),
  //     host: Joi.string().required(),
  //     username: Joi.string().required(),
  //     password: Joi.string(),
  //     database: Joi.string().required(),
  //     port: Joi.number(),
  //     ssl: Joi.object({
  //       rejectUnauthorized: Joi.boolean(),
  //       ca: Joi.alternatives(
  //         Joi.string(),
  //         Joi.object({
  //           path: Joi.string().required(),
  //         }),
  //       ),
  //       key: Joi.alternatives(
  //         Joi.string(),
  //         Joi.object({
  //           path: Joi.string().required(),
  //         }),
  //       ),
  //       cert: Joi.alternatives(
  //         Joi.string(),
  //         Joi.object({
  //           path: Joi.string().required(),
  //         }),
  //       ),
  //     }),
  //   }),
  // ),
  // }
  ();

export default () => {
  const config = yaml.load(
    readFileSync(
      resolve(
        process.cwd(),
        process.env.CONFIG_FILE_PATH || YAML_CONFIG_FILENAME,
      ),
      'utf8',
    ),
  ) as ConfigType;

  const valid = CONFIG_VALIDATION_SCHEMA.validate(config, {
    abortEarly: false,
  });
  if (valid.error) {
    console.error('error while validating config', valid.error.details);
    throw new Error('invalid config');
  }

  return config;
};
