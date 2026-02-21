import { Injectable, Scope, ConsoleLogger } from '@nestjs/common';
import { isErrorLike, serializeError } from 'serialize-error';
import pino, { type Logger } from 'pino';

@Injectable({ scope: Scope.TRANSIENT })
export class PinoLogger extends ConsoleLogger {
  public static Instance = new PinoLogger();

  private pino: Logger;
  private section: string;

  constructor(section?: string) {
    super();

    this.section = section || '';

    this.pino = pino.pino({
      level: 'debug',
      base: undefined,
      timestamp: false,
      messageKey: 'message',
    });
  }

  public Error(message: string, data?: Record<string, any>) {
    const logData = { ...data };
    if (logData && 'error' in logData && isErrorLike(logData.error)) {
      logData.error = serializeError(logData.error);
    }

    console.error(
      JSON.stringify({
        message,
        data,
      }),
    );
  }

  public log(message: any, ...args: any[]) {
    const context = this.section ?? args.pop();
    const data = args.shift();

    this.pino.info(
      {
        payload: data,
        section: context,
      },
      message,
    );
  }

  public error(message: any, ...args: any[]) {
    const context = this.section ?? args.pop();
    const data = args.shift();

    const logData: Record<string, unknown> = {
      payload: data,
      section: context,
      args,
    };

    if (message instanceof Error) {
      logData.error = serializeError(message);
      message = message.message;
    }

    this.pino.error(
      logData,
      message,
    );
  }

  public warn(message: any, ...args: any[]) {
    const context = this.section ?? args.pop();
    const data = args.shift();

    this.pino.warn(
      {
        payload: data,
        section: context,
      },
      message,
    );
  }

  public debug(message: any, ...args: any[]) {
    const context = this.section ?? args.pop();
    const data = args.shift();

    this.pino.debug(
      {
        payload: data,
        section: context,
      },
      message,
    );
  }

  public verbose(message: any, ...args: any[]) {
    const context = this.section ?? args.pop();
    const data = args.shift();

    this.pino.trace(
      {
        payload: data,
        section: context,
      },
      message,
    );
  }

  public critical(message: any, ...args: any[]) {
    const context = this.section ?? args.pop();
    const data = args.shift();

    this.pino.fatal(
      {
        payload: data,
        section: context,
      },
      message,
    );
  }
}
