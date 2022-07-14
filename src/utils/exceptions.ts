import { HttpException, HttpStatus } from "@nestjs/common";

interface ExceptionResponseData {
  error: string;
  success?: boolean;
}

export const throwBadRequest = (error: string, addSuccessField: boolean = false) => throwException(error, HttpStatus.BAD_REQUEST, addSuccessField);

export const throwJWTError = (error: string, addSuccessField: boolean = false) => throwException(error, HttpStatus.UNAUTHORIZED, addSuccessField);

export const throwException = (error: string, status: HttpStatus = HttpStatus.BAD_REQUEST, addSuccessField: boolean = true) => {
  const dataThrown: ExceptionResponseData = { error };
  if (addSuccessField) {
    dataThrown.success = false;
  }
  throw new HttpException(
    dataThrown,
    status
  )
}