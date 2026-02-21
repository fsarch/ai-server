import { Test, TestingModule } from '@nestjs/testing';
import { ModuleConfigurationService } from './module-configuration.service.js';

describe('ModuleService', () => {
  let service: ModuleConfigurationService<Record<string, any>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ModuleConfigurationService],
    }).compile();

    service = module.get<ModuleConfigurationService<Record<string, any>>>(
      ModuleConfigurationService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
