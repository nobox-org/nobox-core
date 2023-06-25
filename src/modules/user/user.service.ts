import {
   HttpException,
   HttpStatus,
   Inject,
   Injectable,
   Scope,
} from '@nestjs/common';
import { getUserModel, MUser } from '@/schemas';
import { AuthLoginResponse } from '../../types';
import { CustomLogger as Logger } from '@/modules/logger/logger.service';
import { ScreenedUserType } from '../../schemas/utils';
import { throwBadRequest } from '@/utils/exceptions';
import { argonAbs, contextGetter } from '@/utils';
import { Filter, ObjectId } from 'mongodb';
import { screenFields } from '@/utils/screenFields';
import { GetUserInput, RegisterUserInput } from './types';

@Injectable({ scope: Scope.REQUEST })
export class UserService {
   private userModel: ReturnType<typeof getUserModel>;

   constructor(@Inject('REQUEST') private context, private logger: Logger) {
      this.contextFactory = contextGetter(this.context.req, this.logger);
      this.userModel = getUserModel(this.logger);
   }

   private contextFactory: ReturnType<typeof contextGetter>;

   private UserIdFromContext() {
      this.logger.sLog({}, 'ProjectService:UserIdFromContext');
      const user = this.contextFactory.getValue(['user'], { silent: true });
      return user ? user?._id : '';
   }

   async getCurrentUser() {
      const { details } = await this.exists({ id: this.UserIdFromContext() });
      return details;
   }

   async register(registerUserInput: RegisterUserInput): Promise<any> {
      const { bool: userExists } = await this.exists({
         email: registerUserInput.email,
      });
      if (userExists) {
         throwBadRequest('User With Email Address already Exists');
      }
      const createdUser = await this.userModel.insert(registerUserInput);
      this.logger.debug(
         `UserService:create user details Saved ${JSON.stringify({
            registerUserInput,
         })}`,
         'User Registration',
      );
      return createdUser;
   }

   async exists({
      email,
      id,
   }: {
      email?: string;
      userName?: string;
      id?: string;
   }): Promise<{ bool: boolean; details: MUser }> {
      const query = {
         ...(email ? { email } : {}),
         ...(id ? { _id: id } : {}),
      };

      if (Object.keys(query).length <= 0) {
         throw new HttpException(
            {
               error: 'Provide an email or userName or an Id',
            },
            HttpStatus.BAD_REQUEST,
         );
      }
      const details = await this.userModel.findOne({
         ...query,
         _id: new ObjectId(query._id),
      });

      return {
         bool: !!details,
         details,
      };
   }

   async userPasswordMatch(
      filter: Record<any, string>,
      password: string,
   ): Promise<AuthLoginResponse> {
      const user = await this.userModel.findOne(filter);
      if (!user) {
         this.logger.sLog(filter, 'userPasswordMatch:User is Not found');
         throw new HttpException(
            {
               error: 'Email or Password is Incorrect',
               loggedIn: false,
            },
            HttpStatus.BAD_REQUEST,
         );
      }

      let match: boolean;
      try {
         match = await argonAbs.compare(password, user.password, this.logger);
      } catch (error) {
         this.logger.sLog({ error }, 'userPasswordMatch:Error');
         return {
            match: false,
            details: screenFields(user, ['password']),
         };
      }

      return {
         match,
         details: screenFields(user, ['password']),
      };
   }

   async list(query?: Filter<MUser>): Promise<any> {
      return this.userModel.find(query);
   }

   async getUserDetails(args: {
      id?: string;
      email?: string;
   }): Promise<ScreenedUserType> {
      this.logger.sLog(
         { id: args.id, emailProvided: !!args.email },
         'user.service: getUserDetails',
      );
      const { id, email } = args;

      if (!id && !email) {
         throw new HttpException(
            {
               error: 'Provide an id or email',
            },
            HttpStatus.BAD_REQUEST,
         );
      }

      const userDetails = await this.userModel.findOne({
         ...(id && { _id: new ObjectId(id) }),
         ...(email && { email }),
      });

      if (!userDetails) {
         this.logger.debug('user.service.getUserDetails: User not found');
         throw new HttpException(
            {
               error: 'User Not Found',
            },
            HttpStatus.NOT_FOUND,
         );
      }

      return screenFields(userDetails, ['password']);
   }

   async getUser(
      arg: GetUserInput,
      opts?: {
         throwIfNotFound?: boolean;
      },
   ): Promise<ScreenedUserType> {
      this.logger.sLog(
         { id: arg._id, emailProvided: !!arg.email },
         'user.service: getUser',
      );

      const { _id, email } = arg;

      const userDetails = await this.userModel.findOne({
         ...(_id && { _id: new ObjectId(arg._id) }),
         ...(email && { email: arg.email }),
      });

      this.logger.sLog({ userDetails, arg }, 'user.service: getUser');

      if (!userDetails) {
         if (opts?.throwIfNotFound) {
            throwBadRequest('User Not found');
         }
         return null;
      }
      return screenFields(userDetails, ['password']);
   }

   async getUsers(): Promise<ScreenedUserType[]> {
      const userDetails = await this.userModel.find();
      this.logger.sLog({ userDetails }, 'user.service: getUsers');
      return userDetails.map((u: any) => (u as any).screenFields());
   }

   async confirmAccount(
      confirmationCode: string,
      email: string,
   ): Promise<boolean> {
      const confirmAccount = (await this.userModel.findOneAndUpdate(
         { 'tokens.confirmAccount': confirmationCode, email },
         {
            accountStatus: { confirmed: true },
         },
         {
            returnDocument: 'after',
         },
      )) as any;
      if (!confirmAccount) {
         this.logger.debug('user.service.confirmAccount: User does not exist');
         throw new HttpException(
            {
               error: 'Either Code or Email is incorrect',
            },
            HttpStatus.BAD_REQUEST,
         );
      }

      return true;
   }

   async resetPassword(newPassword: string, userId: string): Promise<boolean> {
      const updateNewPassword = await this.userModel.findOneAndUpdate(
         { _id: new ObjectId(userId) },
         {
            password: newPassword,
         },
      );

      if (!updateNewPassword) {
         this.logger.debug(
            'user.service.resetPassword: Password was not updated, maybe User Could not be found' +
               updateNewPassword,
         );
         throw new HttpException(
            {
               error: 'Try Again, Something Went Wrong',
            },
            HttpStatus.BAD_REQUEST,
         );
      }

      return true;
   }
}
