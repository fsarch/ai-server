import { Test, TestingModule } from '@nestjs/testing';
import { StaticUacService } from './static.service';

describe('StaticUacService', () => {
  let service: StaticUacService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StaticUacService],
    }).compile();

    service = module.get<StaticUacService>(StaticUacService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
