import * as jwt from 'jsonwebtoken';
import { throwBadRequest, throwJWTError } from '../utils/exceptions';
import config from '../config';
import { CustomLoggerInstance as Logger } from '@/modules/logger/logger.service';

const jwtSecret = config().serverConfig.jwtSecret;
export const generateJWTToken = (args: {
   details: any;
   secret?: string;
   neverExpires?: boolean;
   expiresIn?: string;
}): string => {
   Logger.sLog(
      { expiresIn: args.expiresIn, neverExpires: args.neverExpires },
      'generateJWTToken',
   );
   try {
      const {
         details,
         secret = jwtSecret,
         neverExpires = false,
         expiresIn = '36h',
      } = args;
      const baseArgs = [{ userDetails: details }, secret];
      const finalArgs = !neverExpires ? [...baseArgs, { expiresIn }] : baseArgs;
      return jwt.sign.apply(this, finalArgs);
   } catch (error) {
      throwBadRequest('generateJWTToken:' + error);
   }
};

export const verifyJWTToken = <T>(
   token: string,
   opts = { throwOnError: true },
): string | Record<any, any> => {
   try {
      return jwt.verify(token, jwtSecret);
   } catch (error) {
      Logger.debug('verifyJWTToken:' + error);
      if (opts.throwOnError) {
         throwJWTError('Authorization error');
      }
      return null;
   }
};
