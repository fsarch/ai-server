import { Module } from '@nestjs/common';
import Joi from 'joi';
import { ModuleConfigurationService } from './module-configuration.service.js';

@Module({})
export class ModuleConfiguration {
  static register(
    token: string | symbol,
    options: {
      name: string;
      validationSchema?: Joi.Schema;
    },
  ) {
    return {
      module: ModuleConfiguration,
      providers: [
        {
          provide: 'CONFIG_OPTIONS',
          useValue: options,
        },
        {
          provide: token,
          useClass: ModuleConfigurationService,
        },
      ],
      exports: [token],
    };
  }
}
