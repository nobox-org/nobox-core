import * as dotenv from 'dotenv';
import { MailServerChoiceEnum, SMSServerChoiceEnum } from '../mail/types';
import { setEnv } from '@/utils/set-env';
const env = setEnv();

dotenv.config({ path: `env/.${env}.env` });


//Official Config

export const OFFICIAL_NAME = process.env.OFFICIAL_NAME || '';
export const COMPANY_NAME = process.env.COMPANY_NAME || '';
export const COMPANY_ADDRESS = process.env.COMPANY_ADDRESS || '';
export const PRESENT_YEAR = String(new Date().getFullYear());

// Server Config

export const PORT = parseInt(process.env.SERVER_PORT) || 4000;
export const DOMAIN = process.env.DOMAIN || 'pbid.io';
export const SERVER_NAME = process.env.SERVER_NAME || 'Name this thing';
export const DOCS_PATH = process.env.DOCS_PATH || 'apidocs';
export const IP_WHITE_LIST = process.env.IP_WHITE_LIST || '';
export const SERVER_URL = process.env.SERVER_URL;
export const SERVER_PROTOCOL = process.env.SERVER_PROTOCOL;
export const SERVER_ADDRESS = process.env.SERVER_ADDRESS;

// DB CONFIG
export const MONGO_HOST = process.env.MONGO_HOST || ''
export const MONGO_USERNAME = process.env.MONGO_INITDB_ROOT_USERNAME || '';
export const MONGO_PASSWORD = process.env.MONGO_INITDB_ROOT_PASSWORD || ''
export const MONGO_PORT = parseInt(process.env.PORT) || 0;
export const MONGO_DB_NAME = process.env.MONGO_INITDB_DATABASE || '';
export const MONGO_AUTH_SOURCE = process.env.MONGO_AUTH_SOURCE || '';
export const MONGO_SSL_BOOL = process.env.MONGO_SSL === 'true';
export const MONGO_PROTOCOL = process.env.MONGO_PROTOCOL || 'mongodb';

// JWT Config
export const JWT_SECRET = process.env.JWT_SECRET || '';
export const JWT_EXPIRES_IN = parseInt(process.env.JWT_EXPIRES_IN) || 86400;

// MINIO Config
export const MINIO_PROFILE_PICTURE_BUCKET_FOLDER = process.env.MINIO_PROFILE_PICTURE_BUCKET_FOLDER || '';
export const MINIO_API_BUCKET_NAME = process.env.MINIO_API_BUCKET_NAME || '';
export const MINIO_USE_SSL = process.env.MINIO_USE_SSL || false;
export const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || 'gbenga123';
export const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || 'Akintunde123';
export const MINIO_URL = process.env.MINIO_URL || ''


// MAIL Config
export const MAIL_SENDER_NAME = process.env.MAIL_SENDER_NAME || '';
export const MAIL_SENDER_EMAIL = process.env.MAIL_SENDER_EMAIL || '';
export const MAIL_DOMAIN = process.env.MAIL_DOMAIN || '';
export const MAIL_API_KEY = process.env.MAIL_API_KEY || '';
export const POSTMARK_API_KEY = process.env.POSTMARK_API_KEY || '';
export const FIREBASE_ALL_USERS_TOPIC = process.env.FIREBASE_ALL_USERS_TOPIC || '';

const mailServerChoice = process.env.MAIL_SERVER_CHOICE as MailServerChoiceEnum || MailServerChoiceEnum.POSTMARK;
if (!Object.values(MailServerChoiceEnum).includes(mailServerChoice)) {
    throw 'Wrong Enum for Mail Server Choice'
}
export const MAIL_SERVER_CHOICE: MailServerChoiceEnum = mailServerChoice;


const smsServerChoice = process.env.SMS_SERVER_CHOICE as SMSServerChoiceEnum || SMSServerChoiceEnum.TERMII;
if (!Object.values(SMSServerChoiceEnum).includes(smsServerChoice)) {
    throw 'Wrong Enum for SMS Server Choice'
}

//SMS
export const SMS_SERVER_CHOICE: SMSServerChoiceEnum = smsServerChoice;

export const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
export const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
export const TWILIO_MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID || '';

export const TERMII_API_KEY = process.env.TERMII_API_KEY || '';
export const TERMII_BASE_URL = process.env.TERMII_BASE_URL || '';

export const MESSAGEBIRD_API_KEY = process.env.MESSAGEBIRD_API_KEY || '';


//BROWSER
export const BROWSER_ADDRESS = process.env.BROWSER_ADDRESS || '';
export const BROWSER_PROTOCOL = process.env.BROWSER_PROTOCOL || '';

export const DEACTIVATE_EMAILS = process.env.DEACTIVATE_EMAILS || '';

