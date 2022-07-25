import { HttpException, HttpStatus } from "@nestjs/common";

interface ExceptionResponseData {
  error: string[];
  success?: boolean;
}

export const throwBadRequest = (error: string | string[], addSuccessField: boolean = false) => throwException(error, HttpStatus.BAD_REQUEST, addSuccessField);


export const throwGraphqlBadRequest = (error: string) => {
  throw new HttpException(
    {error},
    HttpStatus.BAD_REQUEST
  )
}

export const throwJWTError = (error: string, addSuccessField: boolean = false) => throwException(error, HttpStatus.UNAUTHORIZED, addSuccessField);

export const throwException = (error: string | string[], status: HttpStatus = HttpStatus.BAD_REQUEST, addSuccessField: boolean = true) => {
  if (typeof error === "string") {
    error = [error];
  }

  const dataThrown: ExceptionResponseData = { error };
  if (addSuccessField) {
    dataThrown.success = false;
  }
  throw new HttpException(
    dataThrown,
    status
  )
}