import { Global, Module } from '@nestjs/common';
import { PinoLogger } from './pino-logger.service.js';

@Global()
@Module({
  providers: [PinoLogger],
  exports: [PinoLogger],
})
export class PinoLoggerModule {}
