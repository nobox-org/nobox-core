import { HttpException, HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import { getUserModel, MUser } from '../schemas/slim-schemas/user.slim.schema';
import { AuthLoginResponse } from 'src/types';
import { CustomLogger as Logger } from 'src/logger/logger.service';
import { FileService } from '../file/file.service';
import { MailService } from '../mail/mail.service';
import { BufferedFile } from 'src/types';
import { minioConfig } from '../config';
import { ScreenedUserType } from '../schemas/utils';
import { SendConfirmationCodeDto } from './dto/gen.dto';
import { randomNumbers } from '@/utils/randomCardCode';
import { throwBadRequest } from '@/utils/exceptions';
import { RegisterUserInput, GetUserInput, UpdateUserInput } from './graphql/input';
import { CONTEXT } from '@nestjs/graphql';
import { FileUpload as GraphQLFileUpload } from 'graphql-upload-minimal';
import readGraphQlImage from '@/utils/readGraphQLImage';
import { EmailTemplate } from '@/mail/types';
import { contextGetter } from '@/utils';
import { Filter } from 'mongodb';


interface TriggerOTPDto { phoneNumber: string, confirmationCode: string }

@Injectable({ scope: Scope.REQUEST })
export class UserService {

  private userModel: ReturnType<typeof getUserModel>;

  constructor(
    @Inject(CONTEXT) private context,
    private fileUploadService: FileService,
    private mailService: MailService,
    private logger: Logger
  ) {
    this.contextFactory = contextGetter(this.context.req, this.logger);
    this.userModel = getUserModel(this.logger);
  }

  private contextFactory: ReturnType<typeof contextGetter>;

  private GraphQlUserId() {
    this.logger.sLog({}, "ProjectService:GraphQlUserId");
    const user = this.contextFactory.getValue(["user"], { silent: true });
    return user ? user?._id : "";
  }

  private async triggerOTP({ phoneNumber, confirmationCode }: TriggerOTPDto) {
    this.mailService.sendSMS(
      {
        phoneNumber,
        message: "Your OTP is " + confirmationCode
      },
    );
  }

  async getCurrentUser() {
    const { details } = await this.exists({ id: this.GraphQlUserId() });
    return details;
  }

  async register(registerUserInput: RegisterUserInput): Promise<any> {
    const { bool: userExists } = await this.exists({ email: registerUserInput.email });
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

  async update({ id, ...updates }: UpdateUserInput): Promise<any> {

    const updatedUser = await this.userModel.findOneAndUpdate({ _id: id }, {
      ...updates
    });


    this.logger.debug(
      `UserService:create user details Saved ${JSON.stringify(
        updates,
      )}`,
      'User Update',
    );
    return updatedUser;
  }

  async sendShortCode({ email, phoneNumber }: SendConfirmationCodeDto): Promise<any> {
    const confirmationCode = randomNumbers(6);
    const query: any = {
      ...(email ? { email } : {}),
      ...(phoneNumber ? { phoneNumber } : {})
    }
    const user = await this.userModel.findOneAndUpdate(query, { tokens: { confirmAccount: confirmationCode }, claimed: false }, {
      upsert: true,
      returnDocument: 'after',
    });

    this.logger.debug(`UserService:sendShortCode` + JSON.stringify({ user }))

    await this.triggerOTP({ phoneNumber, confirmationCode })
  }

  async exists({ email, id }: { email?: string, userName?: string, id?: string }): Promise<{ bool: boolean; details: MUser }> {
    const query = {
      ...(email ? { email } : {}),
      ...(id ? { _id: id } : {}),
    }

    if (Object.keys(query).length <= 0) {
      throw new HttpException(
        {
          error: "Provide an email or userName or an Id",
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const details = await this.userModel.findOne(query);

    return {
      bool: !!details,
      details,
    };
  }

  async userPasswordMatch(
    filter: Record<any, string>,
    password: string,
  ): Promise<AuthLoginResponse> {
    const ret = {} as AuthLoginResponse;
    const userInstance = (await this.userModel.findOne(filter)) as any;
    if (userInstance === null) {
      this.logger.sLog(filter, "userPasswordMatch:User is Not found");
      throw new HttpException(
        {
          error: 'Email or Password is Incorrect',
          loggedIn: false,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    ret.match = await userInstance.comparePassword(password);
    ret.details = userInstance.screenFields();
    return ret;
  }

  async list(query?: Filter<MUser>): Promise<any> {
    return this.userModel.find(query);
  }

  async getUserDetails(id: string): Promise<ScreenedUserType> {
    this.logger.sLog({ id }, "user.service: getUserDetails");
    const userDetails = (await this.userModel.findOne({ _id: id })) as any;
    if (!userDetails) {
      this.logger.debug('user.service.getUserDetails: User not found');
      throw new HttpException(
        {
          error: 'User Not Found',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return userDetails.screenFields();
  }

  async getUser({ id }: GetUserInput): Promise<ScreenedUserType> {
    const userDetails = (await this.userModel.findOne({ _id: id })) as any;

    this.logger.sLog({ userDetails, id }, "user.service: getUser");

    if (!userDetails) {
      throwBadRequest("User Not found")
    }
    return userDetails.screenFields();
  }


  async getUsers(): Promise<ScreenedUserType[]> {
    const userDetails = await this.userModel.find();
    this.logger.sLog({ userDetails }, "user.service: getUsers");
    return userDetails.map((u: any) => (u as any).screenFields());
  }


  async updateUserPicture(file: BufferedFile | GraphQLFileUpload, id: string = this.GraphQlUserId()): Promise<any> {
    try {

      if (!(file instanceof BufferedFile)) {
        file = await readGraphQlImage(file);
      }

      this.logger.sLog({ id }, "user.service: updateUserPicture");

      const {
        relativeUrl,
        publicUrl,
      } = await this.fileUploadService.uploadBufferToMinio(
        file,
        minioConfig.apiBucketName,
        minioConfig.profilePictureBucketFolder
      );

      if (publicUrl) {
        const userDetails = await this.userModel.findOneAndUpdate(
          { _id: id },
          {
            profileImage: relativeUrl,
          },
          {
            returnDocument: 'after',
          },
        );

        if (!userDetails) {
          throw `User is probably not found`;
        }

        this.logger.log(
          `Image Uploaded ${JSON.stringify({ id, publicUrl, relativeUrl })}`,
        );
        return {
          relativeUrl,
          publicUrl,
          userDetails
        };
      }
      throw `Something unexpected Went Wrong, Minio Public Url is Empty, ${{
        publicUrl,
      }}`;
    } catch (error) {
      this.logger.debug(`updateUserPicture: ${error}`);
      throw error;
    }
  }

  async confirmAccount(confirmationCode: string, email: string): Promise<boolean> {
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

  async resetPassword(
    newPassword: string,
    userId: string,
  ): Promise<boolean> {
    const updateNewPassword = await this.userModel
      .findOneAndUpdate(
        { _id: userId },
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

  async forgotPassword(email: string): Promise<any> {
    const exists = await this.exists({ email });
    if (!exists.bool) {
      throw new HttpException(
        {
          error: 'PhoneNumber does not match any user',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const forgotPasswordToken = randomNumbers(6);

    this.logger.debug('Add forgotPasswordToken to User Details');

    const update = await this.userModel.findOneAndUpdate(
      { email },
      {
        'tokens.forgotPassword': forgotPasswordToken,
      },
      { returnDocument: "after" },
    );

    if (update) {
      this.mailService.send(
        {
          name: update.firstName,
          email,
        },
        EmailTemplate.FORGOT_PASSWORD,
        {},
      );
    }
    return true;
  }
}
