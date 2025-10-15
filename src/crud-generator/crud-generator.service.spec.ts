import { Test, TestingModule } from '@nestjs/testing';
import { CrudGeneratorService } from './crud-generator.service';

describe('CrudGeneratorService', () => {
  let service: CrudGeneratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CrudGeneratorService],
    }).compile();

    service = module.get<CrudGeneratorService>(CrudGeneratorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
