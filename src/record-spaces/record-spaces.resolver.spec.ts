import { Test, TestingModule } from '@nestjs/testing';
import { RecordSpacesResolver } from './record-spaces.resolver';
import { RecordSpacesService } from './record-spaces.service';

describe('RecordSpacesResolver', () => {
  let resolver: RecordSpacesResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RecordSpacesResolver, RecordSpacesService],
    }).compile();

    resolver = module.get<RecordSpacesResolver>(RecordSpacesResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
