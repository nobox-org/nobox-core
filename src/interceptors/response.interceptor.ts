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
import { LogTrackerService } from '@/modules/track-logs/log-tracker.service';

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

      const trace: TraceInit = req?.req?.trace;
      const { reqId = 'Untraced', dbTimes = [], logTimes = [], sourceUrl } = trace || {};

      return next.handle().pipe(
         map(data => {
            const t0 = req['startTime'];
            const t1 = performance.now();
            const timeTaken = t1 - t0;

            const highProcessingRequest = timeTaken > 1000;

            const sumDbTime = dbTimes
               .map(({ time }) => time)
               .reduce(
                  (accumulator, currentValue) =>
                     accumulator + Number(currentValue),
                  0,
               );

            const sumLogTime = logTimes
               .map(({ time }) => time)
               .reduce(
                  (accumulator, currentValue) =>
                     accumulator + Number(currentValue),
                  0,
               );

            const nonDbTime = timeTaken - (sumDbTime + sumLogTime);

            const logTrackerService = new LogTrackerService(CustomLoggerInstance);
            const totalTime = dbTimes.reduce((acc, record) => acc + parseFloat(record.time), 0);

            logTrackerService.finalise(reqId, {
               stage: "finalised",
               'requestDetails.timeTaken': totalTime,
            });

            const requestReport = {
               reqId,
               timeTaken,
               dbTimes,
               sourceUrl,
               highProcessingRequest,
               date: new Date(),
               nonDbTime,
               sumLogTime,
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
                     nonDbTime,
                     trace,
                  },
               });
            }

            logger.sLog(
               requestReport,
               `ResponseInterceptor:: Ends Processing Request:  sumDbTime: ${sumDbTime} `,
               'cyan',
            );

            return data;
         }),
      );
   }
}
