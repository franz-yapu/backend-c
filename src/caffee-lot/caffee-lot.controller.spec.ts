import { Test, TestingModule } from '@nestjs/testing';
import { CaffeeLotController } from './caffee-lot.controller';
import { CaffeeLotService } from './caffee-lot.service';

describe('CaffeeLotController', () => {
  let controller: CaffeeLotController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CaffeeLotController],
      providers: [CaffeeLotService],
    }).compile();

    controller = module.get<CaffeeLotController>(CaffeeLotController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
