import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Joi from 'joi';

@Injectable()
export class ModuleConfigurationService<T extends Record<string, any>> {
  private readonly envConfig: T;

  constructor(
    @Inject('CONFIG_OPTIONS') private options: Record<string, any>,
    private readonly configService: ConfigService,
  ) {
    this.envConfig = this.configService.get(options.name);

    if (!this.envConfig) {
      throw new Error(`missing configuration section: ${options.name}`);
    }

    const schema = options.validationSchema as Joi.Schema | undefined;

    if (schema) {
      const valid = schema.validate(this.envConfig, {
        abortEarly: false,
      });
      if (valid.error) {
        console.error('error while validating config', valid.error.details);
        throw new Error('invalid config');
      }
    }
  }

  get(): T;
  get<TKey extends keyof T>(key: TKey): T[TKey];
  get<TKey extends keyof T>(key?: TKey): T | T[TKey] {
    if (!key) {
      return this.envConfig;
    }

    return this.envConfig[key];
  }
}
