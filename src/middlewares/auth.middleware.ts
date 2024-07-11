import { Injectable, NestMiddleware, Scope } from '@nestjs/common';
import { Response } from 'express';
import { CustomLogger as Logger } from '@/modules/logger/logger.service';
import { RequestWithEmail } from '@/types';
import { UserService } from '@/modules/user/user.service';

@Injectable({ scope: Scope.REQUEST })
export class AuthMiddleware implements NestMiddleware {
   constructor(private userService: UserService, private logger: Logger) { }

   async use(req: RequestWithEmail, res: Response, next: () => void) {
      this.logger.sLog(
         { auth: req.headers.authorization },
         'AuthMiddleware::use::validating token',
      );
      const userDetails = await this.userService.checkToken(req);

      req.req.user = userDetails;
      next();
   }
}
