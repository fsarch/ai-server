import { Module } from '@nestjs/common';
import { OidcAuthService } from './oidc-auth.service.js';
import { ModuleConfiguration } from '../../configuration/module/module-configuration.module.js';

@Module({
  imports: [
    ModuleConfiguration.register('AUTH_CONFIG', {
      name: 'auth',
    }),
  ],
  providers: [OidcAuthService],
  exports: [OidcAuthService],
})
export class OidcAuthModule {}
