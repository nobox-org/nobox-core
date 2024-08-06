// import * as jwt from 'jsonwebtoken';
import { throwBadRequest } from './exceptions';
// import config from '../config';
import * as speakeasy from 'speakeasy';
import { CustomLoggerInstance as Logger } from '@/modules/logger/logger.service';

const temp_secret = speakeasy.generateSecret();

export const generateOtpToken = (args: {
   details: Record<any, any>;
   secret?: string;
   neverExpires?: boolean;
   expiresIn?: string;
}): {user: string, otp: string} => {
   Logger.sLog(
      { expiresIn: args.expiresIn, neverExpires: args.neverExpires },
      'generateOtpToken',
   );
   try {
      const {
         details,
         secret = temp_secret.base32,
         // neverExpires = false,
         // expiresIn = '60',
      } = args;


      // const baseArgs = [details, secret];
      // const finalArgs = !neverExpires ? [...baseArgs, { expiresIn }] : baseArgs;

      const otp = speakeasy.totp({
         secret,
         encoding: 'base32',
         step: 60, // OTP valid for 60 seconds
      });

      // return jwt.sign.apply(this, finalArgs);
      return {
         user: details.email,
         otp
      };

   } catch (error) {
      throwBadRequest('generateJWTToken:' + error);
   }
};

export const verifyOtpToken = (
   email: string,
   token: string,
   opts = { throwOnError: true },
): boolean => {
   // try {
   //    return jwt.verify(token, jwtSecret);
   // } catch (error) {
   //    Logger.debug('verifyJWTToken:' + error);
   //    if (opts.throwOnError) {
   //       throwJWTError('Authorization error');
   //    }
   //    return null;
   // }

   return false;
};
