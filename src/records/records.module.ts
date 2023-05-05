import { Module } from '@nestjs/common';
import { RecordsService } from './records.service';
import { RecordSpacesModule } from '@/record-spaces/record-spaces.module';

@Module({
  imports: [RecordSpacesModule],
  providers: [RecordsService],
  exports: [RecordsService]
})
export class RecordsModule { }
