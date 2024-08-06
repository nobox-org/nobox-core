import { CustomLoggerInstance as Logger } from '@/modules/logger/logger.service';
import { HttpException, HttpStatus } from '@nestjs/common';

interface ExceptionResponseData {
   error: string[];
   success?: boolean;
}

export const throwBadRequest = (
   error: string | string[],
   addSuccessField = false,
) => throwException(error, HttpStatus.BAD_REQUEST, addSuccessField);

export const throwJWTError = (error: string, addSuccessField = false) =>
   throwException(error, HttpStatus.UNAUTHORIZED, addSuccessField);

export const throwException = (
   error: string | string[],
   status: HttpStatus = HttpStatus.BAD_REQUEST,
   addSuccessField = true,
) => {
   if (typeof error === 'string') {
      error = [error];
   }

   const dataThrown: ExceptionResponseData = { error };

   if (addSuccessField) {
      dataThrown.success = false;
   }

   Logger.sLog({ dataThrown }, "exception::throwException");

   throw new HttpException(dataThrown, status);
};
