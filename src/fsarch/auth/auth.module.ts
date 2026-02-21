import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthService } from './auth.service.js';
import { StaticAuthModule } from './static/static.module.js';
import { AuthGuard } from './guards/auth.guard.js';
import { ModuleConfiguration } from '../configuration/module/module-configuration.module.js';
import Joi from 'joi';
import { STATIC_AUTH_CONFIG_VALIDATOR } from './static/static-auth-config.validator.js';
import { JwtJwkAuthModule } from './jwt-jwk/jwt-jwk-auth.module.js';
import { JWT_JWK_AUTH_CONFIG_VALIDATOR } from './jwt-jwk/jwt-jwk-auth-config.validator.js';
import { OidcAuthModule } from "./oidc/oidc-auth.module.js";
import { OIDC_AUTH_CONFIG_VALIDATOR } from "./oidc/oidc-auth-config.validator.js";
import { WellKnownController } from "./well-known.controller.js";

@Module({
  controllers: [WellKnownController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    AuthService,
  ],
  imports: [
    StaticAuthModule,
    ModuleConfiguration.register('AUTH_CONFIG', {
      validationSchema: Joi.alternatives(
        STATIC_AUTH_CONFIG_VALIDATOR,
        JWT_JWK_AUTH_CONFIG_VALIDATOR,
        OIDC_AUTH_CONFIG_VALIDATOR,
      ),
      name: 'auth',
    }),
    JwtJwkAuthModule,
    OidcAuthModule,
  ],
  exports: [AuthService],
})
export class AuthModule {}
