import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StaticAuthService } from './static/static-auth.service.js';
import type { IAuthService, IUser } from './types/auth-service.type.js';
import { ConfigAuthType } from '../configuration/config.type.js';
import { JwtJwkAuthService } from './jwt-jwk/jwt-jwk-auth.service.js';
import { OidcAuthService } from "./oidc/oidc-auth.service.js";

@Injectable()
export class AuthService implements IAuthService {
  private readonly authService: IAuthService;

  constructor(
    private readonly configService: ConfigService,
    private readonly staticAuthService: StaticAuthService,
    private readonly jwtJwkAuthService: JwtJwkAuthService,
    private readonly oidcAuthService: OidcAuthService,
  ) {
    const authType = configService.get<ConfigAuthType['type']>('auth.type');

    if (authType === 'static') {
      this.authService = staticAuthService;
    } else if (authType === 'jwt-jwk') {
      this.authService = jwtJwkAuthService;
    } else if (authType === 'oidc') {
      this.authService = oidcAuthService;
    } else {
      throw new Error(`Unsupported auth type: ${authType}`);
    }
  }

  validateRequest(request: any): Promise<IUser> {
    return this.authService.validateRequest(request);
  }

  signIn(username: string, password: string): Promise<{ accessToken: string }> {
    return this.authService.signIn(username, password);
  }

  get getWwwAuthenticateValue() {
    return this.authService.getWwwAuthenticateValue?.bind(this.authService);
  }

  get getOidcMetadata() {
    return this.authService.getOidcMetadata?.bind(this.authService);
  }
}
