import { Test, TestingModule } from '@nestjs/testing';
import { CrudGeneratorController } from './crud-generator.controller';
import { CrudGeneratorService } from './crud-generator.service';

describe('CrudGeneratorController', () => {
  let controller: CrudGeneratorController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CrudGeneratorController],
      providers: [CrudGeneratorService],
    }).compile();

    controller = module.get<CrudGeneratorController>(CrudGeneratorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
