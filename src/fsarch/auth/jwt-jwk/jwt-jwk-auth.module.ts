import { Module } from '@nestjs/common';
import { JwtJwkAuthService } from './jwt-jwk-auth.service.js';
import { ModuleConfiguration } from '../../configuration/module/module-configuration.module.js';

@Module({
  imports: [
    ModuleConfiguration.register('AUTH_CONFIG', {
      name: 'auth',
    }),
  ],
  providers: [JwtJwkAuthService],
  exports: [JwtJwkAuthService],
})
export class JwtJwkAuthModule {}
