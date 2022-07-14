import { Test, TestingModule } from '@nestjs/testing';
import { EpService } from './ep.service';

describe('EpService', () => {
  let service: EpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EpService],
    }).compile();

    service = module.get<EpService>(EpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
