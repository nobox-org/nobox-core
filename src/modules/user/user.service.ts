import {
   HttpException,
   HttpStatus,
   Inject,
   Injectable,
   Scope,
} from '@nestjs/common';
import { getUserModel, MUser, ScreenedUserType, UpdateFilter } from '@nobox-org/shared-lib';
import { CustomLogger as Logger } from '@/modules/logger/logger.service';
import { throwBadRequest } from '@/utils/exceptions';
import { measureTimeTaken } from '@/utils';
import { Filter } from '@nobox-org/shared-lib';
import { screenFields } from '@/utils/screenFields';
import { RegisterUserInput } from './types';
import { USER_NOT_FOUND } from '@/utils/constants/error.constants';

@Injectable({ scope: Scope.REQUEST })
export class UserService {
   private userModel: ReturnType<typeof getUserModel>;

   constructor(@Inject('REQUEST') private context, private logger: Logger) {
      this.userModel = getUserModel(this.logger);
   }

   async register(registerUserInput: RegisterUserInput): Promise<any> {
      const userDetails = await this.getUserDetails({
         email: registerUserInput.email,
      });

      if (userDetails) {
         throwBadRequest('User With Email Address already Exists');
      }

      const createdUser = await measureTimeTaken({
         func: this.userModel.insert(registerUserInput),
         tag: 'ProjectService:create',
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

   async getUserDetails(query: Filter<MUser>, opts?: {
      throwIfNotFound?: boolean;
   }): Promise<ScreenedUserType> {
      this.logger.sLog(
         query,
         'user.service: getUserDetails',
      );

      const { throwIfNotFound = true } = opts || {};

      const userDetails = await this.userModel.findOne(query);

      if (!userDetails || throwIfNotFound) {

         if (!userDetails) {
            if (throwIfNotFound) {
               this.logger.sLog({}, `user.service.getUserDetails:user not found`);
               throw new HttpException(
                  {
                     error: USER_NOT_FOUND,
                  },
                  HttpStatus.NOT_FOUND,
               );
            }
            return null;
         }

      }

      return screenFields(userDetails, ['password']);
   }
}
