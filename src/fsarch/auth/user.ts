import type { IUser } from './types/auth-service.type.js';

export interface UserClaims {
  sub: string;
  email_verified?: boolean;
  name?: string;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  preferred_name?: string;
  [key: string]: any;
}

export class User implements IUser {
  private readonly accessToken: string;
  private claims?: UserClaims;

  constructor(data: { accessToken: string }) {
    this.accessToken = data.accessToken;
    this.claims = this.extractClaimsFromToken(data.accessToken);
  }

  getAccessToken() {
    return this.accessToken;
  }

  getClaims(): UserClaims | undefined {
    return this.claims;
  }

  private extractClaimsFromToken(accessToken: string): UserClaims | undefined {
    try {
      // JWT Format: header.payload.signature
      const parts = accessToken.split('.');
      if (parts.length !== 3) {
        return undefined;
      }

      // Decode the payload (second part)
      const payload = parts[1];
      const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));

      return decoded as UserClaims;
    } catch (error) {
      // If token claims cannot be extracted, continue without them
      return undefined;
    }
  }
}
