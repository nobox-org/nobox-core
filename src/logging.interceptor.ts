import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CustomLogger as Logger } from './logger/logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {

 constructor(private logger: Logger) {
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();

    this.logger.sLog(
      { path: req.originalUrl, body: req.body, params: req.params },
      'Network Request',
    );

    return next.handle().pipe(map(data => ({ data })));
  }
}
