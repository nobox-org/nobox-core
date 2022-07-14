import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { CustomLoggerInstance as Logger } from 'src/logger/logger.service';
import { throwJWTError } from 'src/utils/exceptions';
import { verifyJWTToken } from 'src/utils/jwt';

@Injectable()
export class GraphqlJwtAuthGuard implements CanActivate {
    async canActivate(
        context: ExecutionContext,
    ): Promise<boolean> {
        const ctx = GqlExecutionContext.create(context);
        const { req } = ctx.getContext();

        const authorization = req.headers.authorization;
        if (!authorization) {
            throwJWTError("UnAuthorized");
            return false;
        }

        const { userDetails } = verifyJWTToken(authorization) as any;
        Logger.debug(JSON.stringify(userDetails), "");

        req.user = userDetails;

        return true;
    }
}