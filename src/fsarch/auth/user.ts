import type { IUser } from './types/auth-service.type.js';

export class User implements IUser {
  private readonly accessToken: string;

  constructor(data: { accessToken: string }) {
    this.accessToken = data.accessToken;
  }

  getAccessToken() {
    return this.accessToken;
  }
}
