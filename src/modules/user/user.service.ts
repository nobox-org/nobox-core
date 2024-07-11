import {
   HttpException,
   HttpStatus,
   Inject,
   Injectable,
   Scope,
} from '@nestjs/common';
import { getUserModel, MUser, ScreenedUserType, UpdateFilter, Filter, ObjectId } from 'nobox-shared-lib';
import { CustomLogger as Logger } from '@/modules/logger/logger.service';
import { throwBadRequest, throwJWTError } from '@/utils/exceptions';
import { measureTimeTaken } from '@/utils';
import { screenFields } from '@/utils/screenFields';
import { RegisterUserInput } from './types';
import { USER_NOT_FOUND } from '@/utils/constants/error.constants';
import { verifyJWTToken } from '@/utils/jwt';
import { RequestWithEmail } from '@/types';

@Injectable({ scope: Scope.REQUEST })
export class UserService {
   private userModel: ReturnType<typeof getUserModel>;

   constructor(@Inject('REQUEST') private context, private logger: Logger) {
      this.userModel = getUserModel(this.logger);
   }

   async register(registerUserInput: RegisterUserInput, opts?: {
      disableUserExistenceCheck: boolean
   }): Promise<any> {

      const { disableUserExistenceCheck = false } = opts || {};

      if (disableUserExistenceCheck) {
         const userDetails = await this.getUserDetails(
            {
               email: registerUserInput.email,
            },
            { throwIfNotFound: false });

         if (userDetails) {
            throwBadRequest('User With Email Address already Exists');
         }
      }

      const createdUser = await measureTimeTaken({
         func: this.userModel.insert(registerUserInput),
         tag: 'UserService:create',
         context: this.context,
      });

      this.logger.debug(
         `UserService:create user details Saved ${JSON.stringify({
            registerUserInput,
         })}`,
         'User Registration',
      );

      return createdUser;
   }


   async update(args: {
      query: Filter<MUser>
      update: UpdateFilter<MUser>
   }): Promise<{ bool: boolean; details: MUser }> {
      this.logger.sLog({ args }, 'UserService::update');
      const { query, update } = args
      const details = await measureTimeTaken({
         func: this.userModel.findOneAndUpdate(query, update),
         tag: 'UserService::update',
         context: this.context,
      });
      return details;
   }

   async checkToken(req: RequestWithEmail) {
      this.logger.sLog(
         { auth: req.headers.authorization },
         'AuthMiddleware::use::validating token',
      );
      const authorization = req.headers.authorization;

      if (!authorization) {
         this.logger.sLog(
            {},
            'UserService::checkToken::error::authorization not in header',
         );
         throwJWTError('UnAuthorized');
      }

      const verificationResult = await measureTimeTaken({
         func: verifyJWTToken(authorization.split(' ')[1]),
         logger: this.logger,
         tag: 'UserService::checkToken::verifyingJWTToken',
      });

      if (!verificationResult) {
         this.logger.sLog(
            {},
            'UserService::checkToken::error::authorization not in header',
         );
         throwJWTError('Bad Authorization Key');
      };

      const { id } = verificationResult;

      const userObjectId = new ObjectId(id);

      this.logger.sLog(
         { verified: true },
         'UserService::checkToken::token verified',
      );

      const user = await this.getUserDetails({
         _id: userObjectId
      });

      if (!user) {
         this.logger.sLog(
            { userExists: !!user },
            'UserService::checkToken::error::user not found',
         );
         throwJWTError('UnAuthorized');
      }

      return user;

   }


   async getUserDetails(query: Filter<MUser>, opts?: {
      throwIfNotFound?: boolean;
   }): Promise<ScreenedUserType> {
      this.logger.sLog(
         { query, opts },
         'user.service: getUserDetails',
      );

      const { throwIfNotFound = true } = opts || {};

      const userDetails = await this.userModel.findOne(query);

      if (!userDetails && throwIfNotFound) {
         this.logger.sLog({}, `user.service.getUserDetails:user not found`);
         throw new HttpException(
            {
               error: USER_NOT_FOUND,
            },
            HttpStatus.NOT_FOUND,
         );
      }

      if (!userDetails && !throwIfNotFound) {
         return null;
      }

      return screenFields(userDetails, ['password']);
   }


}
