import {
  HttpException, HttpStatus,
  Inject,
  Injectable,
  NotImplementedException,
} from '@nestjs/common';
import { IAuthService } from '../types/auth-service.type.js';
import { Request } from 'express';
import { ModuleConfigurationService } from '../../configuration/module/module-configuration.service.js';
import { ConfigOidcAuthType } from '../../configuration/config.type.js';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { User } from '../user.js';
import { AuthUnauthorizedException } from "../errors/AuthUnauthorizedException.js";

@Injectable()
export class OidcAuthService implements IAuthService {
  private oidcConfiguration: { authorization_endpoint: string; jwks_uri: string; scopes_supported: Array<string> } | null = null;
  private jwkSet: ReturnType<typeof createRemoteJWKSet> | null;

  constructor(
    @Inject('AUTH_CONFIG')
    private readonly authConfigService: ModuleConfigurationService<ConfigOidcAuthType>,
  ) {
  }

  private async getOidcConfiguration() {
    if (!this.oidcConfiguration) {
      const response = await fetch(this.authConfigService.get('discovery_url'));
      if (!response.ok) {
        throw new HttpException('Failed to fetch OIDC configuration', HttpStatus.INTERNAL_SERVER_ERROR);
      }
      this.oidcConfiguration = await response.json();
    }

    return this.oidcConfiguration;
  }

  private async getJwkSet() {
    if (!this.jwkSet) {
      const configuration = await this.getOidcConfiguration();

      this.jwkSet = createRemoteJWKSet(new URL(configuration.jwks_uri));
    }

    return this.jwkSet;
  }

  public async signIn(
    username: string,
    password: string,
  ): Promise<{ accessToken: string }> {
    throw new NotImplementedException();
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  public async validateRequest(request: any): Promise<User> {
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new AuthUnauthorizedException();
    }

    const jwkSet = await this.getJwkSet();

    try {
      const jwtData = await jwtVerify(token, jwkSet);

      request['user'] = {
        id: jwtData.payload.sub,
      };
    } catch (error) {
      console.debug('could not verify jwt', error);

      throw new AuthUnauthorizedException(error);
    }

    return new User({
      accessToken: token,
    });
  }

  public async getWwwAuthenticateValue() {
    return `Bearer resource_metadata="/.well-known/oauth-protected-resource"`;
  }

  public async getOidcMetadata() {
    try {
      return await this.getOidcConfiguration();
    } catch (err) {
      console.debug('Failed to get OIDC metadata', err);
      return null;
    }
  }
}
