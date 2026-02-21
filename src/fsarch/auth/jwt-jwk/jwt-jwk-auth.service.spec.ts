import { Test, TestingModule } from '@nestjs/testing';
import { JwtJwkAuthService } from './jwt-jwk-auth.service.js';

describe('JwtJwkService', () => {
  let service: JwtJwkAuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtJwkAuthService],
    }).compile();

    service = module.get<JwtJwkAuthService>(JwtJwkAuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
