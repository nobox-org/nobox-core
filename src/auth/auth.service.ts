import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { LoginInput } from './graphql/input/login.input';
import { generateJWTToken, verifyJWTToken } from 'src/utils/jwt';
import { CustomLogger as Logger } from 'src/logger/logger.service';
import { throwJWTError } from 'src/utils/exceptions';
import { AuthCheckInput } from './graphql/input/gen.input';
import { AuthCheckResponse } from './graphql/model/gen.model';

@Injectable()
export class AuthService {

  constructor(private userService: UserService, private logger: Logger) { }

  async login({ email, password }: LoginInput): Promise<any> {
    const { match, details } = await this.userService.userPasswordMatch(
      { email },
      password,
    );

    if (!match) {
      this.logger.debug(
        `Controller.Auth.login:  ${JSON.stringify({
          error: 'User Not Found',
        })}`
      );
      throwJWTError('Email or Password is Incorrect');
    }

    return { token: generateJWTToken(details) }
  }

  authCheck({ token }: AuthCheckInput): AuthCheckResponse {
    this.logger.sLog({ token }, "AuthService:authCheck")
    try {
      return {
        expired: !Boolean(verifyJWTToken(token))
      }

    } catch (error) {
      this.logger.debug(error);
      return {
        expired: true
      }
    }
  }
}
