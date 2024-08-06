// import * as jwt from 'jsonwebtoken';
import { throwBadRequest } from './exceptions';
// import config from '../config';
import * as speakeasy from 'speakeasy';
import { CustomLoggerInstance as Logger } from '@/modules/logger/logger.service';


export const generateOtpToken = (args: {
   details: Record<any, any>;
   secret?: string;
   neverExpires?: boolean;
   expiresIn?: number;
}): {user: string, 
   otp: string, 
   secret: {
      base: string;
      encoding: string;
      expiresIn: number;
   }} => {
   Logger.sLog(
      { expiresIn: args.expiresIn, neverExpires: args.neverExpires },
      'generateOtpToken',
   );
   
   const temp_secret = speakeasy.generateSecret();
   const {
      details,
      secret = temp_secret.base32,
      // neverExpires = false,
      expiresIn = 60,
   } = args;

   try {
      // const baseArgs = [details, secret];
      // const finalArgs = !neverExpires ? [...baseArgs, { expiresIn }] : baseArgs;

      const otp = speakeasy.totp({
         secret,
         encoding: 'base32',
         step: expiresIn, // OTP valid for 60 seconds
      });

      // return jwt.sign.apply(this, finalArgs);
      return {
         user: details.email,
         otp,
         secret: {
            base: secret,
            encoding: 'base32',
            expiresIn  
         }
      };

   } catch (error) {
      throwBadRequest('generateJWTToken:' + error);
   }
};

export const verifyOtpToken = (
   details: Record<string, any>,
   token: string,
   opts = { throwOnError: true },
): boolean => {

   const {temp_secret} = details;

   const {base, encoding, expiresIn} = temp_secret;

   
   try {
      // ! Unable to resolve verification
      const verified = speakeasy.totp.verify({
         secret: base,
         encoding,
         token,
         window: 2
      });

      if (verified) {
         Logger.sLog({}, 'verifyOtpToken::verified otp');
         return true;
      } else {
         Logger.sLog({}, 'verifyOtpToken::could not validate otp');
      }

   } catch(error) {
      Logger.error('verifyOtpToken::Error verifying otp', error);
   };

   return false;
};
