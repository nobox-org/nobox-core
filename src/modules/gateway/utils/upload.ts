import { AWS_ACCESS_KEY_ID, AWS_S3_BUCKET_NAME, AWS_S3_REGION, AWS_SECRET_ACCESS_KEY, MAX_UPLOAD_SIZE } from '@/config/resources/process-map';
import { slugify } from '@/utils/slugify';
import * as multer from 'multer';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

export const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: +MAX_UPLOAD_SIZE * 1024 * 1024 // File size in MB
    },
});


// const accessKeyId = envVars.AWS_ACCESS_KEY_ID;
// const secretAccessKey = envVars.AWS_SECRET_ACCESS_KEY;
// const region = envVars.AWS_S3_REGION;


// Initialize AWS S3 client
export const s3Client = new S3Client({
  region: AWS_S3_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});


const getFileNameAndExtension = (filename: string) => {
    const parts = filename.split('.');
    const extension = parts[parts.length - 1];
    const name = parts.slice(0, -1).join('.');
    return { name, extension };
};


export async function uploadToS3(file: Express.Multer.File) {


    if (!file) {
        throw new Error('File not provided');
    }

    const { name, extension } = getFileNameAndExtension(file.originalname);

    const filename = `uploads/${uuidv4()}_${slugify(name)}.${extension}`;

    const readableStream = new Readable();
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    readableStream._read = () => {}; // _read is required but you can noop it
    readableStream.push(file.buffer);
    readableStream.push(null);

    

    const s3_params = {
        Bucket: AWS_S3_BUCKET_NAME as string,
        Key: filename, // Specify the filename
        Body: readableStream, // File stream or buffer
        ContentType: file.mimetype,
    };

    try {
        // const data = await s3.upload(s3_params).promise();

        const parallelUpload = new Upload({
            client: s3Client,
            params: s3_params
        });

        const data = await parallelUpload.done();
        // const fileUrl = `https://${s3BucketName}.s3.${s3Region}.amazonaws.com/${filename}`;
        const fileUrl = data.Location;

        return fileUrl; // Return the URL of the uploaded file
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
    }
}


