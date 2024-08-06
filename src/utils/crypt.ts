import { ENCRYPTION_SECRET_KEY } from '@/config/resources/process-map';
import * as crypto from 'crypto';

const algorithm = 'aes-256-cbc';
const secretKey = Buffer.from(ENCRYPTION_SECRET_KEY, 'base64');

export function encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}${encrypted}`;
}

export function decrypt(encryptedString: string): string {
    const iv = Buffer.from(encryptedString.slice(0, 32), 'hex');
    const decipher = crypto.createDecipheriv(algorithm, secretKey, iv);
    let decrypted = decipher.update(encryptedString.slice(32), 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
