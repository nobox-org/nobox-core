import { Injectable, NestMiddleware, Scope } from '@nestjs/common';
import { Response } from 'express';
import { CustomLogger as Logger } from '@/modules/logger/logger.service';
import { RequestWithEmail } from '@/types';
import { throwBadRequest, throwJWTError } from '@/utils/exceptions';
import { AuthService } from '@/modules/auth/auth.service';
import { LogTrackerService } from '@/modules/track-logs/log-tracker.service';

@Injectable({ scope: Scope.REQUEST })
export class ClientAuthMiddleware implements NestMiddleware {
   constructor(
      private authService: AuthService,
      private logger: Logger,
      private logTrackerService: LogTrackerService
   ) { }

   async use(req: RequestWithEmail, res: Response, next: () => void) {

      this.logger.sLog(
         {},
         'ClientAuthMiddleware::use::validating token',
      );
      const authorization = req.headers.authorization;

      if (!authorization) {
         this.logger.sLog(
            {},
            'ClientAuthMiddleware::use::error::authorization not in header',
         );
         throwJWTError('UnAuthorized');
      }

      const { userDetails, expired, userNotFound } = await this.authService.authCheck({ token: authorization.split(' ')[1] });

      this.logTrackerService.addUserId(req['reqId'], userDetails?._id);

      if (userNotFound) {
         throwBadRequest("Token is not valid")
      }

      if (expired) {
         throwBadRequest("Token has expired")
      }

      this.logger.sLog(
         { verified: true },
         'ClientAuthMiddleware::use::token verified',
      );

      (req.req as any).user = userDetails;
      next();
   }
}
