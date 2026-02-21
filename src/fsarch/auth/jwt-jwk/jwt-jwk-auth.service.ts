import {
  Inject,
  Injectable,
  NotImplementedException,
} from '@nestjs/common';
import { IAuthService } from '../types/auth-service.type.js';
import { Request } from 'express';
import { ModuleConfigurationService } from '../../configuration/module/module-configuration.service.js';
import { ConfigJwtJwkAuthType } from '../../configuration/config.type.js';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { User } from '../user.js';
import { AuthUnauthorizedException } from "../errors/AuthUnauthorizedException.js";

@Injectable()
export class JwtJwkAuthService implements IAuthService {
  private jwkSet: ReturnType<typeof createRemoteJWKSet> | null;

  constructor(
    @Inject('AUTH_CONFIG')
    private readonly authConfigService: ModuleConfigurationService<ConfigJwtJwkAuthType>,
  ) {
  }

  public async signIn(
    username: string,
    password: string,
  ): Promise<{ accessToken: string }> {
    throw new NotImplementedException();
  }

  private async getJwkSet() {
    if (!this.jwkSet) {
      const jwkUrl = this.authConfigService.get('jwkUrl');

      this.jwkSet = createRemoteJWKSet(new URL(jwkUrl));
    }

    return this.jwkSet;
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

      return new User({
        accessToken: token,
      });
    } catch (error) {
      console.debug('could not verify jwt', error);

      throw new AuthUnauthorizedException(error);
    }
  }
}
