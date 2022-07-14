import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { catchError, map, Observable, of } from 'rxjs';
import { CustomLogger as Logger } from '../logger/logger.service';

@Injectable()
export class AuthInterceptor implements NestInterceptor {

  constructor(private logger: Logger) {
  }

  intercept(_: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => {
        return data;
      }));
  }
}
