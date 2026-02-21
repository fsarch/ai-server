import { Test, TestingModule } from '@nestjs/testing';
import { PinoLogger } from './pino-logger.service.js';

describe('LoggerService', () => {
  let service: PinoLogger;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PinoLogger],
    }).compile();

    service = module.get<PinoLogger>(PinoLogger);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
