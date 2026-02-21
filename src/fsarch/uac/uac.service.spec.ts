import { Test, TestingModule } from '@nestjs/testing';
import { UacService } from './uac.service';

describe('UacService', () => {
  let service: UacService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UacService],
    }).compile();

    service = module.get<UacService>(UacService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
