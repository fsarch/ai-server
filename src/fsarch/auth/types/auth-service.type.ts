export interface IUser {
  getAccessToken(): string;
}

export interface IAuthService {
  signIn(username: string, password: string): Promise<{ accessToken: string }>;
  validateRequest(request): Promise<IUser>;
  getWwwAuthenticateValue?(): Promise<string>;
  getOidcMetadata?(): Promise<{ scopes_supported: Array<string>; authorization_endpoint: string; jwks_uri: string }>;
}
