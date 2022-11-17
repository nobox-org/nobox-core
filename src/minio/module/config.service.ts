import * as Minio from 'minio';
import * as crypto from 'crypto'
import { Injectable, Inject, HttpStatus, HttpException } from '@nestjs/common';
import { MINIO_CONFIG_OPTIONS, LOGGER } from '../constants';
import { getDefaultPolicy } from '../policies/defaultPolicy';
import { CustomLogger } from '@/logger/logger.service';
import { BufferedFile } from '@/types';
import { getPublicPolicy } from '../policies';


@Injectable()
export class MinioService {
  private readonly MinioClient: Minio.Client;
  private readonly CopyConditions: Minio.CopyConditions;
  private readonly InstanceUrl: string;
  constructor(
    @Inject(MINIO_CONFIG_OPTIONS) private options: Minio.ClientOptions,
    @Inject(LOGGER) private logger: CustomLogger,
  ) {
    this.MinioClient = new Minio.Client(this.options);
    this.CopyConditions = new Minio.CopyConditions();
    this.InstanceUrl = `${this.options.useSSL ? 'https' : 'http'}://${this.options.endPoint}`;
  }

  public get client(): Minio.Client {
    return this.MinioClient;
  }

  public get copyConditions(): Minio.CopyConditions {
    return this.CopyConditions;
  }

  private async setBucketPolicy(bucketName: string, policy: Record<any, string | any[]>) {
    try {
      return await this.MinioClient.setBucketPolicy(bucketName, JSON.stringify(policy));

    } catch (error) {
      this.logger.error(`minio: setBucketPolicy: ${error}`)
    }
  }

  public async bucketExists(bucket: string) {
    try {
      return await this.MinioClient.bucketExists(bucket);
    } catch (error) {
      this.logger.error(`minio: bucketExists: ${error} `)
    }
  }


  public async listBuckets() { return await this.MinioClient.listBuckets(); }

  public async makeBucket(bucketName: string, makeUrlPermanent: boolean, makePublic = true, region = 'us-southeast-1',) {
    try {

      if (await this.bucketExists(bucketName)) {
        throw `Bucket ${bucketName} Already Exists`;
      }
      await this.MinioClient.makeBucket(bucketName, region);
      this.logger.debug(`Bucket ${bucketName} Created`);
      if (makeUrlPermanent) {
        await this.setBucketPolicy(bucketName, getDefaultPolicy(bucketName));
        console.log(`File Url In ${bucketName} is now permanent`)
      }

      if (makePublic) {
        await this.setBucketPolicy(bucketName, getPublicPolicy(bucketName));
        console.log(`Files In ${bucketName} is now public`)
      }
    } catch (error) {
      this.logger.error(`minio: makeBucket: ${error} ${{
        bucketName,
        region
      }}`)
    }
  }

  public async uploadByFilePath(filePath: string, objectName: string, bucketName: string, metaData: Record<any, string> = {}) {
    try {
      const id = await this.MinioClient.fPutObject(bucketName, objectName, filePath, metaData);

      return {
        id,
        publicUrl: this.options.useSSL ? 'https' : 'http' + '://' + this.options.endPoint + ':' + this.options.port + '/' + bucketName + '/' + objectName
      }
    } catch (error) {
      this.logger.error(`minio: upload: ${error}`)
    }
  }

  public async uploadByBuffer(file: BufferedFile, bucketName: string, bucketFolder: string, metaData: Record<any, string> = {}) {
    if (!(await this.bucketExists(bucketName))) {
      this.logger.debug(`Bucket ${bucketName} does not exist`);
      await this.makeBucket(bucketName, true, true, 'us-east-1');
    }
    const objectName = bucketFolder + '/' + this.makeUniqueFileName(file.originalname);
    metaData['Content-Type'] = file.mimetype;
    const id = await this.MinioClient.putObject(bucketName, objectName, file.buffer, file.size, metaData);
   

    const relativeUrl = bucketName + '/' + objectName;
    return {
      id,
      relativeUrl,
      publicUrl: `${this.InstanceUrl}/${relativeUrl}`,
    }
  }

  private makeUniqueFileName(originalName: string) {
    const hashedFileName = crypto.createHash('md5').update(Date.now().toString()).digest("hex");
    const ext = originalName.substring(originalName.lastIndexOf('.'), originalName.length);
    return `${hashedFileName}${ext}`;
  }
}
