import { Test, TestingModule } from '@nestjs/testing';
import { StaticAuthService } from './static-auth.service.js';

describe('LocalAuthService', () => {
  let service: StaticAuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StaticAuthService],
    }).compile();

    service = module.get<StaticAuthService>(StaticAuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
