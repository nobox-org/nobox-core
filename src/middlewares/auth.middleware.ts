import { Injectable, NestMiddleware, Scope } from '@nestjs/common';
import { Response } from 'express';
import { CustomLogger as Logger } from '@/modules/logger/logger.service';
import { RequestWithEmail } from '@/types';
import { verifyJWTToken } from '@/utils/jwt';
import { throwJWTError } from '@/utils/exceptions';
import { UserService } from '@/modules/user/user.service';
import { measureTimeTaken } from '@/utils';
import { ObjectId } from 'nobox-shared-lib';

@Injectable({ scope: Scope.REQUEST })
export class AuthMiddleware implements NestMiddleware {
   constructor(private userService: UserService, private logger: Logger) { }

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

      const verificationResult = await measureTimeTaken({
         func: verifyJWTToken(authorization.split(' ')[1]),
         logger: this.logger,
         tag: 'AuthMiddleware::use::verifyingJWTToken',
      });

      if (!verificationResult) {
         this.logger.sLog(
            {},
            'AuthMiddleware::use::error::authorization not in header',
         );
         throwJWTError('Bad Authorization Key');
      };

      const { userDetails } = verificationResult;
      const { _id } = userDetails;

      const userObjectId = _id instanceof ObjectId ? _id : new ObjectId(userDetails._id);

      this.logger.sLog(
         { verified: true },
         'AuthMiddleware::use::token verified',
      );

      const user = await this.userService.getUserDetails({
         _id: userObjectId
      });

      if (!user) {
         this.logger.sLog(
            { userExists: !!user },
            'AuthMiddleware::use::error::user not found',
         );
         throwJWTError('UnAuthorized');
      }

      req.req.user = userDetails;
      next();
   }
}
