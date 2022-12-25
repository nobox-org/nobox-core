import { Injectable } from '@nestjs/common';
import { MinioService } from '../minio/module';
import { FileMetaData } from './types';
import { CustomLogger as Logger } from '@/logger/logger.service';
import * as CircularJSON from 'circular-json'
import { BufferedFile } from '@/types';

@Injectable()
export class FileService {
    constructor(
        private minioService: MinioService,
        private logger: Logger
    ) { }


    public async uploadBufferToMinio(file: BufferedFile, bucketName: string, bucketFolder: string, metaData?: FileMetaData) {
        try {
            this.logger.sLog({ bucketName, bucketFolder });
            return await this.minioService.uploadByBuffer(file, bucketName, bucketFolder, metaData);
        } catch (error) {
            this.logger.debug(CircularJSON.stringify(error), "uploadBufferToMinio:error")
            throw error;
        }
    }
}
