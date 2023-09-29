// timing.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TimingMiddleware implements NestMiddleware {
   use(req: Request, res: Response, next: NextFunction) {
      req['startTime'] = performance.now();
      next();
   }
}
