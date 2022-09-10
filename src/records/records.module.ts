import { Module } from '@nestjs/common';
import { RecordsService } from './records.service';
import { RecordsResolver } from './records.resolver';
import { MongooseModule } from '@nestjs/mongoose';
import { Record, RecordField, RecordFieldSchema, RecordSchema } from '@/schemas';
import { RecordSpacesModule } from '@/record-spaces/record-spaces.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: Record.name, schema: RecordSchema }, { name: RecordField.name, schema: RecordFieldSchema }]), RecordSpacesModule],
  providers: [RecordsResolver, RecordsService],
  exports: [RecordsService]
})
export class RecordsModule { }
