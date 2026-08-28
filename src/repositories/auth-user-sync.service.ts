import { Injectable } from '@nestjs/common';
import type { User } from '@fsarch/server/auth';
import { UserService } from './user.service.js';
import { UserDto } from '../models/user.dto.js';

/**
 * Application-specific service that synchronizes auth claims with database users.
 * This is NOT part of the fsarch SDK, but rather project-specific logic.
 *
 * @fsarch/server's `User` only exposes `getId()` (the token's `sub` claim, already verified
 * by the auth guard) and `getAccessToken()` - it does not decode/expose the rest of the JWT
 * claims. Since we still want a display name for newly-synced users, the remaining claims
 * (family_name, given_name, ...) are decoded from the access token here.
 */
export type DecodedUserClaims = {
  sub?: string;
  email_verified?: boolean;
  name?: string;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  preferred_name?: string;
  [key: string]: unknown;
};

function decodeClaims(accessToken: string): DecodedUserClaims | undefined {
  try {
    // JWT format: header.payload.signature
    const parts = accessToken.split('.');
    if (parts.length !== 3) {
      return undefined;
    }

    const payload = parts[1];
    return JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));
  } catch {
    // If token claims cannot be extracted, continue without them.
    return undefined;
  }
}

@Injectable()
export class AuthUserSyncService {
  constructor(private readonly userService: UserService) {}

  async findUserIdFromClaims(user: User): Promise<string | null> {
    try {
      const externalId = user.getId();
      if (!externalId) {
        return null;
      }

      const dbUser = await this.userService.findByExternalId(externalId);
      return dbUser ? dbUser.id : null;
    } catch (error) {
      console.error('Failed to lookup user from claims:', error);
      return null;
    }
  }

  async syncUserFromClaims(user: User): Promise<UserDto | null> {
    try {
      const externalId = user.getId();
      if (!externalId) {
        return null;
      }

      // Try to find existing user by external_id (sub)
      const existingUser = await this.userService.findByExternalId(externalId);
      if (existingUser) {
        return existingUser;
      }

      // Create new user from token claims
      const claims = decodeClaims(user.getAccessToken());
      return await this.userService.create({
        external_id: externalId,
        family_name: claims?.family_name || 'Unknown',
        given_name: claims?.given_name || 'Unknown',
        short_name: claims?.preferred_name || claims?.preferred_username || 'User',
      });
    } catch (error) {
      console.error('Failed to sync user from claims:', error);
      return null;
    }
  }
}
