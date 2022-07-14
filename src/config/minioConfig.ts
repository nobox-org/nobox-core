import {
    MINIO_USE_SSL,
    MINIO_SECRET_KEY,
    MINIO_ACCESS_KEY,
    MINIO_PROFILE_PICTURE_BUCKET_FOLDER,
    MINIO_API_BUCKET_NAME,
    MINIO_URL
} from './mainConfig';

export const url: string = MINIO_URL;
export const secretKey: string = MINIO_SECRET_KEY;
export const useSSL: boolean = MINIO_USE_SSL === 'true';
export const keys: { secretKey: string, accessKey: string } = { secretKey: MINIO_SECRET_KEY, accessKey: MINIO_ACCESS_KEY };
export const profilePictureBucketFolder = MINIO_PROFILE_PICTURE_BUCKET_FOLDER;
export const apiBucketName = MINIO_API_BUCKET_NAME;

export const instanceConfig = {
    endPoint: url,
    port: useSSL ? 443 : 80,
    useSSL,
    accessKey: keys.accessKey,
    secretKey: keys.secretKey
}