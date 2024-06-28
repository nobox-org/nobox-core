import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response } from 'express';
import { RequestWithEmail } from '@/types';
import { createUuid } from '@/utils';
import { CustomLogger as Logger } from '@/modules/logger/logger.service';

@Injectable()
export class InitMiddleware implements NestMiddleware {

   constructor(private logger: Logger) { }

   use(req: RequestWithEmail, res: Response, next: () => void) {
      this.logger.debug('InitMiddleware::use');
      req['startTime'] = Date.now();

      const reqId = createUuid();

      req['reqId'] = reqId;

      res.header('Request-ID', reqId);

      this.logger.sLog(
         { reqId, url: req.url },
         `Starts Processing Request: ${reqId}`,
         'cyan'
      );

      next();
   }
}