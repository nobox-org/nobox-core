import { Module } from '@nestjs/common';
import { FileService } from './file.service';
import { MinioModule } from '../minio/module';
import { minioConfig } from '../config'
import { CustomLoggerInstance } from '@/logger/logger.service';

@Module({
  imports: [
    MinioModule.register(minioConfig.instanceConfig, CustomLoggerInstance),
  ],
  providers: [FileService],
  exports: [FileService]
})
export class FileModule { }