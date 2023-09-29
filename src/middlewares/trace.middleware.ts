import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response } from 'express';
import { CustomLoggerInstance as Logger } from '@/modules/logger/logger.service';
import { RequestWithEmail, TraceInit, UsedHttpVerbs } from '@/types';
import { createUuid } from '@/utils';

@Injectable()
export class TraceMiddleware implements NestMiddleware {
   use(req: RequestWithEmail, res: Response, next: () => void) {
      Logger.debug('attaching trace object', 'TraceMiddleware');

      const urlComponents = req.url.split('/');

      const uniqueUrlComponent = urlComponents?.[3];

      const isSearch = (uniqueUrlComponent || []).includes('search?');

      const trace: TraceInit = {
         reqId: createUuid(),
         method: req.method as UsedHttpVerbs,
         isQuery: req.method === UsedHttpVerbs.GET,
         isSearch,
         connectionSource: 'REST',
         uniqueUrlComponent,
         records: {},
         dbTimes: [],
      };

      Object.assign(req, {
         req: {
            headers: {
               ...req.headers,
               functionResources: req.headers['function-resources']
                  ? JSON.parse(req.headers['function-resources'] as string)
                  : undefined,
               'function-resources': undefined,
               structure: req.headers['structure']
                  ? JSON.parse(req.headers['structure'] as string)
                  : undefined,
            },
            trace,
            body: req.body,
            query: req.query,
            params: req.params,
         },
      });
      return next();
   }
}
