import { Test, TestingModule } from '@nestjs/testing';
import { RecordSpacesService } from './record-spaces.service';

describe('RecordSpacesService', () => {
  let service: RecordSpacesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RecordSpacesService],
    }).compile();

    service = module.get<RecordSpacesService>(RecordSpacesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
