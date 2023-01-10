import {
  Inject,
  Injectable,
  NestMiddleware,
  Scope,
} from '@nestjs/common';
import { Response } from 'express';
import { CustomLogger as Logger } from '@/logger/logger.service';
import { Context, RequestWithEmail } from '@/types';
import { verifyJWTToken } from '@/utils/jwt';
import { throwJWTError } from '@/utils/exceptions';
import { UserService } from '@/user/user.service';
import { contextGetter } from '@/utils';
import { CONTEXT } from '@nestjs/graphql';

@Injectable({ scope: Scope.REQUEST })
export class AuthMiddleware implements NestMiddleware {

  constructor(
    private userService: UserService,
    @Inject(CONTEXT) private context: Context,
    private logger: Logger,
  ) {
  }

  async use(req: RequestWithEmail, res: Response, next: () => void) {
    this.logger.sLog({ auth: req.headers.authorization }, "AuthMiddleware::use::validating token");
    const authorization = req.headers.authorization;
    if (!authorization) {
      this.logger.sLog({}, "AuthMiddleware::use::error::authorization not in header");
      throwJWTError("UnAuthorized");
    }
    //measuring time taken
    const t0 = performance.now();


    const { userDetails } = verifyJWTToken(authorization.split(" ")[1]) as any;
    const t1 = performance.now();
    this.logger.sLog({ time: t1 - t0 }, `AuthMiddleware::use:: time taken::: ${t1 - t0}`, "redBright");

    this.logger.sLog({ verified: true }, "AuthMiddleware::use::token verified");


    // const { bool: userExists, details: userDetails } = await this.userService.exists({ id: userId });
    // if (!userExists) {
    //   this.logger.sLog({ userExists }, "AuthMiddleware::use::error::user not found");
    //   throwJWTError("UnAuthorized");
    // }

    req.req.user = userDetails;
    next();
  }
}
