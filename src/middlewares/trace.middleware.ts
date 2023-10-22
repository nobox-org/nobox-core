import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response } from 'express';
import { CustomLoggerInstance as Logger } from '@/modules/logger/logger.service';
import { RequestWithEmail, TraceInit, UsedHttpVerbs } from '@/types';
import { parseStringifiedHeaderObject } from '@/utils/gen';

@Injectable()
export class TraceMiddleware implements NestMiddleware {
   use(req: RequestWithEmail, res: Response, next: () => void) {
      Logger.debug('attaching trace object', 'TraceMiddleware');

      const reqId = req['reqId'];

      if (!reqId) {
         Logger.sLog({}, "reqId is not attached")
      }

      const sourceUrl = req.url;

      const urlComponents = sourceUrl.split('/');

      const uniqueUrlComponent = urlComponents?.[3];

      const isSearch = (uniqueUrlComponent || []).includes('search?');

      const trace: TraceInit = {
         reqId,
         method: req.method as UsedHttpVerbs,
         isQuery: req.method === UsedHttpVerbs.GET,
         isSearch,
         connectionSource: 'REST',
         uniqueUrlComponent,
         sourceUrl,
         records: {},
         dbTimes: [],
         logTimes: [],
      };

      Object.assign(req, {
         req: {
            headers: {
               ...req.headers,
               functionResources: parseStringifiedHeaderObject(req.headers, "function-resources"),
               'function-resources': undefined,
               structure: parseStringifiedHeaderObject(req.headers, "structure"),
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