import { Injectable } from '@nestjs/common';
import { UserService } from './user.service.js';
import { UserClaims } from '../fsarch/auth/user.js';
import { UserDto } from '../models/user.dto.js';

/**
 * Application-specific service that synchronizes auth claims with database users.
 * This is NOT part of the fsarch SDK, but rather project-specific logic.
 */
@Injectable()
export class AuthUserSyncService {
  constructor(private readonly userService: UserService) {}

  async findUserIdFromClaims(claims: UserClaims): Promise<string | null> {
    try {
      const user = await this.userService.findByExternalId(claims.sub);
      return user ? user.id : null;
    } catch (error) {
      console.error('Failed to lookup user from claims:', error);
      return null;
    }
  }

  async syncUserFromClaims(claims: UserClaims): Promise<UserDto | null> {
    try {
      // Try to find existing user by external_id (sub)
      let user = await this.userService.findByExternalId(claims.sub);

      if (user) {
        return user;
      }

      // Create new user from token claims
      user = await this.userService.create({
        external_id: claims.sub,
        family_name: claims.family_name || 'Unknown',
        given_name: claims.given_name || 'Unknown',
        short_name: claims.preferred_name || claims.preferred_username || 'User',
      });

      return user;
    } catch (error) {
      console.error('Failed to sync user from claims:', error);
      return null;
    }
  }
}
