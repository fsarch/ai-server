import { DynamicModule, Module } from '@nestjs/common';
import { StaticUacModule } from './static/static.module.js';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './guards/roles.guard.js';
import { ModuleConfiguration } from '../configuration/module/module-configuration.module.js';
import { UacService } from './uac.service.js';
import Joi from 'joi';
import { CREATE_STATIC_UAC_CONFIG_VALIDATOR } from './static/static-uac-config.validator.js';

@Module({
  imports: [StaticUacModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    UacService,
  ],
})
export class UacModule {
  static register(options: { roles: Array<string> }): DynamicModule {
    return {
      module: UacModule,
      imports: [
        ModuleConfiguration.register('UAC_CONFIG', {
          validationSchema: Joi.alternatives(
            CREATE_STATIC_UAC_CONFIG_VALIDATOR(options.roles),
          ),
          name: 'uac',
        }),
      ],
    };
  }
}
