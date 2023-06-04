import { CustomLoggerInstance } from '@/logger/logger.service';
import { TraceInit } from '@/types';
import { generateCurlCommandFromRequest } from '@/utils/generate-curl-command';
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
    data: T;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
    intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
        const logger = CustomLoggerInstance;
        const req = context.switchToHttp().getRequest();

        logger.sLog({ rawHeaders: req?.rawHeaders }, `ResponseInterceptor::Extracts RawHeaders`);

        const trace: TraceInit = req?.req?.trace;
        const { reqId = "Untraced" } = trace || {};
        const t0 = performance.now();
        logger.sLog({ reqId }, `Starts Processing Request: ${reqId}`, "cyan");
        return next.handle().pipe(map(data => {
            const t1 = performance.now();
            const timeTaken = `${(t1 - t0)} ms`;
            logger.sLog({ reqId, timeTaken, returnedData: data }, `ResponseInterceptor:: Ends Processing Request: ${reqId}, timeTaken: ${timeTaken}`, "cyan");
            return data;
        }));
    }
}