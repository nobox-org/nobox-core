import { CustomLoggerInstance } from '@/modules/logger/logger.service';
import { TraceInit } from '@/types';
import {
   Injectable,
   NestInterceptor,
   ExecutionContext,
   CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import * as Sentry from '@sentry/node';

export interface Response<T> {
   data: T;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
   intercept(
      context: ExecutionContext,
      next: CallHandler,
   ): Observable<Response<T>> {
      const logger = CustomLoggerInstance;
      const req = context.switchToHttp().getRequest();

      logger.sLog(
         { rawHeaders: req?.rawHeaders },
         `ResponseInterceptor::Extracts RawHeaders`,
      );
      const response = context.switchToHttp().getResponse();

      const trace: TraceInit = req?.req?.trace;
      const { reqId = 'Untraced', dbTimes = [] } = trace || {};

      response.header('reqId', reqId);

      logger.sLog({ reqId }, `Starts Processing Request: ${reqId}`, 'cyan');
      return next.handle().pipe(
         map(data => {
            const t0 = req['startTime'];
            const t1 = performance.now();
            const timeTaken = t1 - t0;

            const highProcessingRequest = timeTaken > 1000;

            const requestReport = {
               reqId,
               timeTaken,
               dbTimes,
               returnedData: data,
               highProcessingRequest,
               date: new Date(),
            };

            if (highProcessingRequest) {
               logger.sLog({ timeTaken, reqId }, 'high processing time', 'red');

               Sentry.captureEvent({
                  message: 'High processing Time',
                  level: Sentry.Severity.Warning,
                  extra: {
                     reqId,
                     timeTaken,
                     dbTimes,
                     returnedData: data,
                     trace,
                  },
               });
            }

            logger.sLog(
               requestReport,
               `ResponseInterceptor:: Ends Processing Request: ${reqId}, timeTaken: ${timeTaken}ms`,
               'cyan',
            );
            return data;
         }),
      );
   }
}
