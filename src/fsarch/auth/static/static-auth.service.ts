import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { IAuthService } from '../types/auth-service.type.js';
import { JwtService } from '@nestjs/jwt';
import { ConfigStaticAuthType } from '../../configuration/config.type.js';
import { ModuleConfigurationService } from '../../configuration/module/module-configuration.service.js';
import { Request } from 'express';
import { User } from '../user.js';

@Injectable()
export class StaticAuthService implements IAuthService {
  constructor(
    @Inject('AUTH_CONFIG')
    private readonly authConfigService: ModuleConfigurationService<ConfigStaticAuthType>,
    private readonly jwtService: JwtService,
  ) {}

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  async validateRequest(request: any): Promise<User> {
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      console.debug('could not get token from header');
      throw new UnauthorizedException();
    }
    try {
      const payload = await this.jwtService.verifyAsync(token);

      request['user'] = {
        id: payload.sub,
      };
    } catch (error) {
      console.debug('could not verify jwt', error);

      throw new UnauthorizedException(error);
    }

    return new User({
      accessToken: token,
    });
  }

  async signIn(
    username: string,
    password: string,
  ): Promise<{ accessToken: string }> {
    const user = this.authConfig.users.find(
      (user) => user.username === username,
    );
    if (!user || user.password !== password) {
      throw new Error('user not found');
    }

    const token = await this.jwtService.signAsync(
      {},
      {
        subject: user.id,
      },
    );

    return {
      accessToken: token,
    };
  }

  private get authConfig(): ConfigStaticAuthType {
    return this.authConfigService.get();
  }
}
