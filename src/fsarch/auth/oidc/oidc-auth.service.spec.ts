import { Test, TestingModule } from '@nestjs/testing';
import { OidcAuthService } from './oidc-auth.service.js';

describe('OidcService', () => {
  let service: OidcAuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OidcAuthService],
    }).compile();

    service = module.get<OidcAuthService>(OidcAuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
