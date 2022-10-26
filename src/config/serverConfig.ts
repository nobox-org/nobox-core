import {
  PORT,
  SERVER_NAME,
  DOCS_PATH,
  IP_WHITE_LIST,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  DOMAIN,
  SERVER_URL,
  SERVER_PROTOCOL,
  SERVER_ADDRESS,
} from './mainConfig';

export const domain: string = DOMAIN;

export const port: number = PORT;

export const serverName: string = SERVER_NAME;

export const docsPath: string = DOCS_PATH;

export const ipWhitelist: string[] = IP_WHITE_LIST.split(',');

export const jwtSecret: string = JWT_SECRET;

export const jwtExpiresIn: number = JWT_EXPIRES_IN;

export const serverAddress: string = SERVER_ADDRESS;

export const fullURL: string = `${SERVER_PROTOCOL}://${SERVER_URL}:${PORT}`
