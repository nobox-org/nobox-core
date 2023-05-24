import { ExceptionFilter, Catch, HttpException, ArgumentsHost, HttpStatus } from '@nestjs/common';

@Catch()
export class ErrorFilter implements ExceptionFilter {
    catch(error: Error, host: ArgumentsHost) {
        const response = host.switchToHttp().getResponse();
        const status = (error instanceof HttpException) ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

        if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
            console.error(error.stack);
            return response.status(HttpStatus.BAD_GATEWAY).send('Something went wrong');
        }
    }
}