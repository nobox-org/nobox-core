import {
  Injectable,
  NestMiddleware,
} from '@nestjs/common';
import { Response } from 'express';
import { CustomLoggerInstance as Logger } from '../logger/logger.service';
import { RequestWithEmail, TraceInit, UsedHttpVerbs } from '@/types';
import { createUuid } from '@/utils';

@Injectable()
export class TraceMiddleware implements NestMiddleware {
  use(req: RequestWithEmail, res: Response, next: () => void) {
    Logger.debug("attaching trace object", "TraceMiddleware");

    const trace: TraceInit = {
      reqId: createUuid(),
      method: req.method as UsedHttpVerbs,
      isQuery: req.method === UsedHttpVerbs.GET,
    }
    Object.assign(req, { trace });
    next();
  }
}
