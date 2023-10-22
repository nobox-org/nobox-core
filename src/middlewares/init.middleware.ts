import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response } from 'express';
import { CustomLoggerInstance as Logger } from '@/modules/logger/logger.service';
import { RequestWithEmail } from '@/types';
import { createUuid } from '@/utils';

@Injectable()
export class InitMiddleware implements NestMiddleware {
   use(req: RequestWithEmail, res: Response, next: () => void) {
      req['startTime'] = performance.now();

      const reqId = createUuid();

      req['reqId'] = reqId;

      res.header('Request-ID', reqId);

      Logger.sLog({ reqId, url: req.url }, `Starts Processing Request: ${reqId}`, 'cyan');

      next();
   }
}