import {
  Injectable,
  NestMiddleware,
} from '@nestjs/common';
import { Response } from 'express';
import { CustomLoggerInstance as Logger } from '@/logger/logger.service';
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
        connectionSource: "Graphql",
        records: {}
      }
      Object.assign(req, { trace });
      return next();
    }

    if (!fromGraphqlEndpoint) {
      const trace: TraceInit = {
        reqId: createUuid(),
        method: req.method as UsedHttpVerbs,
        isQuery: req.method === UsedHttpVerbs.GET,
        connectionSource: "REST",
        records: {}
      }

      Object.assign(req, {
        req: {
          headers: {
            ...req.headers,
            functionResources: req.headers["function-resources"] ? JSON.parse(req.headers["function-resources"] as string) : undefined,
            "function-resources": undefined,
            "structure": req.headers["structure"] ? JSON.parse(req.headers["structure"] as string) : undefined,
          },
          trace,
          body: req.body,
          query: req.query,
          params: req.params
        }
      });
      return next();
    }

  }
}
