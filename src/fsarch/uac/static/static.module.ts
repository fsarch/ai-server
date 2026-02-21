import { Module } from '@nestjs/common';
import { StaticUacService } from './static.service.js';
import { ModuleConfiguration } from '../../configuration/module/module-configuration.module.js';

@Module({
  providers: [StaticUacService],
  imports: [
    ModuleConfiguration.register('UAC_CONFIG', {
      name: 'uac',
    }),
  ],
  exports: [StaticUacService],
})
export class StaticUacModule {}
