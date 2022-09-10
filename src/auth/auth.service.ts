import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { ScreenedUserType } from '../schemas/utils';
import { LoginInput } from './graphql/input/login.input';
import { generateJWTToken } from 'src/utils/jwt';
import { CustomLogger as Logger } from 'src/logger/logger.service';
import { throwJWTError } from 'src/utils/exceptions';

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
}
