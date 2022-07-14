import { Test, TestingModule } from '@nestjs/testing';
import { EpController } from './ep.controller';

describe('EpController', () => {
  let controller: EpController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EpController],
    }).compile();

    controller = module.get<EpController>(EpController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
