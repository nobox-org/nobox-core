import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { LoginInput } from './graphql/input/login.input';
import { generateJWTToken, verifyJWTToken } from '@/utils/jwt';
import { CustomLogger as Logger } from '@/logger/logger.service';
import { throwJWTError } from '@/utils/exceptions';
import { AuthCheckInput } from './graphql/input/gen.input';
import { AuthCheckResponse } from './graphql/model/gen.model';
import { AuthResponse } from './graphql/model';

@Injectable()
export class AuthService {

  constructor(private userService: UserService, private logger: Logger) { }

  async assertPasswordMatch({ email, password }: LoginInput) {
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

    return { match, details };
  }

  async login(loginInput: LoginInput): Promise<AuthResponse> {
    this.logger.sLog({ email: loginInput.email }, "authService:login")
    const { details } = await this.assertPasswordMatch(loginInput);
    return { token: generateJWTToken({ details }) }
  }

  async getEternalToken({ token }: AuthCheckInput): Promise<AuthResponse> {
    this.logger.sLog({}, "authService:getEternalToken");
    const { userDetails } = verifyJWTToken(token) as Record<string, any>;
    await this.userService.getUserDetails({ email: userDetails.email });
    return { token: generateJWTToken({ details: userDetails, neverExpires: true }) }
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
