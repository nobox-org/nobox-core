import { Module } from '@nestjs/common';
import { RecordsService } from './records.service';
import { RecordsResolver } from './records.resolver';
import { RecordSpacesModule } from '@/record-spaces/record-spaces.module';

@Module({
  imports: [RecordSpacesModule],
  providers: [RecordsResolver, RecordsService],
  exports: [RecordsService]
})
export class RecordsModule { }
