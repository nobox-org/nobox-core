import { Module } from '@nestjs/common';
import { FileService } from './file.service';
import { MinioModule } from '../minio/module';
import { minioConfig } from '../config'
import { CustomLoggerInstance } from '../logger/logger.service';
import { LoggerModule } from '../logger/logger.module';

@Module({
  imports: [
    MinioModule.register(minioConfig.instanceConfig, CustomLoggerInstance),
    LoggerModule
  ],
  providers: [FileService,],
  exports: [FileService]
})
export class FileModule { }