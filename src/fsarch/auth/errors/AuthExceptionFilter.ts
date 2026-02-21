import { ArgumentsHost, Catch, ExceptionFilter } from "@nestjs/common";
import { Response } from 'express';
import { AuthUnauthorizedException } from "./AuthUnauthorizedException.js";
import { AuthService } from "../auth.service.js";

@Catch(AuthUnauthorizedException)
export class AuthExceptionFilter implements ExceptionFilter {
  constructor(private readonly authServer: AuthService) {
  }

  public async catch(exception: AuthUnauthorizedException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    const authenticateData = await this.authServer.getWwwAuthenticateValue?.();
    if (authenticateData) {
      response.setHeader(
        'WWW-Authenticate',
        authenticateData,
      );
    }

    response.status(status).json(exception.getResponse());
  }

}
