import { Injectable, NestMiddleware, Scope } from '@nestjs/common';
import { Response } from 'express';
import { CustomLogger as Logger } from '@/modules/logger/logger.service';
import { RequestWithEmail } from '@/types';
import { verifyJWTToken } from '@/utils/jwt';
import { throwJWTError } from '@/utils/exceptions';
import { UserService } from '@/modules/user/user.service';
import { measureTimeTaken } from '@/utils';

@Injectable({ scope: Scope.REQUEST })
export class AuthMiddleware implements NestMiddleware {
   constructor(private userService: UserService, private logger: Logger) {}

   async use(req: RequestWithEmail, res: Response, next: () => void) {
      this.logger.sLog(
         { auth: req.headers.authorization },
         'AuthMiddleware::use::validating token',
      );
      const authorization = req.headers.authorization;

      if (!authorization) {
         this.logger.sLog(
            {},
            'AuthMiddleware::use::error::authorization not in header',
         );
         throwJWTError('UnAuthorized');
      }

      const { userDetails } = await measureTimeTaken({
         func: verifyJWTToken(authorization.split(' ')[1]),
         logger: this.logger,
         tag: 'AuthMiddleware::use::verifyingJWTToken',
      });

      this.logger.sLog(
         { verified: true },
         'AuthMiddleware::use::token verified',
      );

      const { bool: userExists } = await this.userService.exists({
         id: userDetails._id,
      });

      if (!userExists) {
         this.logger.sLog(
            { userExists },
            'AuthMiddleware::use::error::user not found',
         );
         throwJWTError('UnAuthorized');
      }

      req.req.user = userDetails;
      next();
   }
}
