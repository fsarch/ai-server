import { Module } from '@nestjs/common';
import { StaticAuthService } from './static-auth.service.js';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ModuleConfiguration } from '../../configuration/module/module-configuration.module.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('auth.secret'),
        signOptions: {
          expiresIn: '2h',
        },
      }),
      inject: [ConfigService],
    }),
    ModuleConfiguration.register('AUTH_CONFIG', {
      name: 'auth',
    }),
  ],
  providers: [StaticAuthService],
  exports: [StaticAuthService],
})
export class StaticAuthModule {}
