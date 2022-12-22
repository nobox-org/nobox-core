import {
  Injectable,
  NestMiddleware,
} from '@nestjs/common';
import { Response } from 'express';
import { CustomLoggerInstance as Logger } from '../logger/logger.service';
import { RequestWithEmail, TraceInit, UsedHttpVerbs } from '@/types';
import { createUuid } from '@/utils';
import { constants } from '@/constants';

@Injectable()
export class TraceMiddleware implements NestMiddleware {
  use(req: RequestWithEmail, res: Response, next: () => void) {
    Logger.debug("attaching trace object", "TraceMiddleware");

    const fromGraphqlEndpoint = req.baseUrl === constants.graphql.endpointPath;

    if (fromGraphqlEndpoint) {
      Logger.debug("request is from graphql endpoint", "TraceMiddleware");
      const trace: TraceInit = {
        reqId: createUuid(),
        connectionSource: "Graphql"
      }
      Object.assign(req, { trace });
      return next();
    }

    if (!fromGraphqlEndpoint) {
      const trace: TraceInit = {
        reqId: createUuid(),
        method: req.method as UsedHttpVerbs,
        isQuery: req.method === UsedHttpVerbs.GET,
        connectionSource: "REST"
      }
      Object.assign(req, { req: { headers: req.headers, trace, body: req.body, query: req.query, params: req.params } });
      return next();
    }

  }
}
