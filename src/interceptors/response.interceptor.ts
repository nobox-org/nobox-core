import { CustomLoggerInstance } from '@/logger/logger.service';
import { TraceInit } from '@/types';
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
        const trace: TraceInit = req?.req?.trace;
        const { reqId = "Untraced" } = trace || {};
        logger.sLog({ reqId }, `Starts Processing Request: ${reqId}`);
        console.time(reqId);
        return next.handle().pipe(map(data => {
            console.timeEnd(reqId);
            return data;
        }));
    }
}