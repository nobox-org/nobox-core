import { Module } from '@nestjs/common';
import { RecordsService } from './records.service';
import { RecordSpaceModule } from '@/record-spaces/record-spaces.module';

@Module({
  imports: [RecordSpaceModule],
  providers: [RecordsService],
  exports: [RecordsService]
})
export class RecordsModule { }
