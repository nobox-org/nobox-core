import * as jwt from 'jsonwebtoken';
import  { throwBadRequest, throwJWTError } from "../utils/exceptions";
import config from '../config';
import { CustomLoggerInstance as Logger } from '../logger/logger.service';

const jwtSecret = config().serverConfig.jwtSecret;
export const generateJWTToken = (details: any, expiresIn: string = '24h'): string => {
    try {
        return jwt.sign({ userDetails: details }, jwtSecret, {
    expiresIn,
  });   
    } catch (error) {
        throwBadRequest('generateJWTToken:' + error);        
    }
};

export const verifyJWTToken = (token: string): string | Record<any, any> => {
  try {
    return jwt.verify(token, jwtSecret);  
  } catch (error) {
    Logger.debug('verifyJWTToken:' + error);
    throwJWTError('Authorization error');
  }
};
