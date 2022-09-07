import { Module } from '@nestjs/common';
import { RecordsService } from './records.service';
import { RecordsResolver } from './records.resolver';
import { LoggerModule } from '@/logger/logger.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Record, RecordField, RecordFieldSchema, RecordSchema } from '@/schemas';
import { RecordSpacesModule } from '@/record-spaces/record-spaces.module';
import { ProjectsModule } from '@/projects/projects.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: Record.name, schema: RecordSchema }, { name: RecordField.name, schema: RecordFieldSchema }]), LoggerModule, RecordSpacesModule, ProjectsModule],
  providers: [RecordsResolver, RecordsService],
  exports: [RecordsService]
})
export class RecordsModule {}
