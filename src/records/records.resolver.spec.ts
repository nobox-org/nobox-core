import { Test, TestingModule } from '@nestjs/testing';
import { RecordsResolver } from './records.resolver';
import { RecordsService } from './records.service';

describe('RecordsResolver', () => {
  let resolver: RecordsResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RecordsResolver, RecordsService],
    }).compile();

    resolver = module.get<RecordsResolver>(RecordsResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
