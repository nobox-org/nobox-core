import { HttpException, HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import { getUserModel, MUser } from '../schemas/slim-schemas/user.slim.schema';
import { AuthLoginResponse, GoogleOAuthUserDetails, OAuthThirdPartyName, ProcessThirdPartyLogin } from 'src/types';
import { CustomLogger as Logger } from 'src/logger/logger.service';
import { FileService } from '../file/file.service';
import { MailService } from '../mail/mail.service';
import { BufferedFile } from '@/types';
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
import { argonAbs, contextGetter } from '@/utils';
import { Filter, ObjectId } from 'mongodb';
import { generateGoogleOAuthLink } from '@/utils/google-oauth-link';
import { generateGithubOAuthLink } from '@/utils/github-oauth-link';
import { Request, Response } from 'express';
import axios from 'axios';
import { generateJWTToken } from '@/utils/jwt';
import { v4 } from 'uuid';
import { screenFields } from '@/utils/screenFields';
import { GITHUB_CALLBACK_URL, GITHUB_CLIENT_AUTH_PATH, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } from '@/config/mainConfig';


interface TriggerOTPDto { phoneNumber: string, confirmationCode: string };

interface AuthConfDetails {
  clientId: string;
  clientSecret: string;
  callBackUrl: string;
}

@Injectable({ scope: Scope.REQUEST })
export class UserService {

  private userModel: ReturnType<typeof getUserModel>;
  private githubAuthConf: AuthConfDetails & { clientAuthPath: string } = {
    clientId: GITHUB_CLIENT_ID,
    clientSecret: GITHUB_CLIENT_SECRET,
    callBackUrl: GITHUB_CALLBACK_URL,
    clientAuthPath: GITHUB_CLIENT_AUTH_PATH
  };

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

    const updatedUser = await this.userModel.findOneAndUpdate({ _id: new ObjectId(id) }, {
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
    const details = await this.userModel.findOne({ ...query, _id: new ObjectId(query._id) });

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
      this.logger.sLog(filter, "userPasswordMatch:User is Not found");
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
      this.logger.sLog({ error }, "userPasswordMatch:Error");
      return {
        match: false,
        details: screenFields(user, ["password"]),
      }
    }

    return {
      match,
      details: screenFields(user, ["password"]),
    };
  }

  async list(query?: Filter<MUser>): Promise<any> {
    return this.userModel.find(query);
  }

  async getUserDetails(id: string): Promise<ScreenedUserType> {
    this.logger.sLog({ id }, "user.service: getUserDetails");
    const userDetails = await this.userModel.findOne({ _id: new ObjectId(id) });
    if (!userDetails) {
      this.logger.debug('user.service.getUserDetails: User not found');
      throw new HttpException(
        {
          error: 'User Not Found',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return screenFields(userDetails, ["password"]);
  }

  async getUser(arg: GetUserInput, opts?: {
    throwIfNotFound?: boolean
  }): Promise<ScreenedUserType> {
    const userDetails = await this.userModel.findOne({ ...arg, _id: new ObjectId(arg._id) });

    this.logger.sLog({ userDetails, arg }, "user.service: getUser");

    if (!userDetails) {
      if (opts?.throwIfNotFound) {
        throwBadRequest("User Not found")
      }
      return null;
    }
    return screenFields(userDetails, ["password"]);
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
          { _id: new ObjectId(id) },
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


  async redirectToGoogleOauth(_: Request, res: Response) {
    this.logger.debug("redirect to google oauth");
    const google = {
      clientId: "client id",
    };
    const uri = generateGoogleOAuthLink({
      clientId: google.clientId,
      redirectUri: `http://localhost:5000/api/google/callback`,
      scope: ['email', 'profile'],
      authType: 'rerequest',
      display: 'popup',
      responseType: 'code',
    })

    this.logger.sLog({ uri }, "Redirecting to Google login");

    return res.redirect(uri);
  }

  async redirectToGithubOauth(_: Request, res: Response) {
    this.logger.debug("redirecting to github oauth");

    const uri = generateGithubOAuthLink({
      clientId: this.githubAuthConf.clientId,
      redirectUri: this.githubAuthConf.callBackUrl,
      scope: ['user'],
    })

    this.logger.sLog({ uri }, "Redirecting to Github login");

    return res.redirect(uri);
  }


  private async getGoogleAccessToken({ code, conf }: { code: string, conf: AuthConfDetails }) {
    try {

      this.logger.debug("getting google access token");

      const params = {
        client_id: conf.clientId,
        client_secret: conf.clientSecret,
        redirect_uri: conf.callBackUrl,
        code,
        grant_type: "authorization_code",
      };


      const data = await axios({
        url: 'https://oauth2.googleapis.com/token',
        method: 'POST',
        params
      });

      const { data: { access_token: accessToken } } = data;

      return accessToken;

    } catch (error) {
      this.logger.warn("Error getting google access token" + error.message);
      throwBadRequest("Something went wrong, please try again");
    }

  }

  private async getGithubAccessToken({ code, conf }: { code: string, conf: AuthConfDetails }) {

    try {
      this.logger.debug("getting github access token");

      const params = {
        client_id: conf.clientId,
        client_secret: conf.clientSecret,
        redirect_uri: conf.callBackUrl,
        code,
      };

      const { data } = await axios({
        url: 'https://github.com/login/oauth/access_token',
        method: 'POST',
        params,
        headers: {
          'Accept': 'application/json'
        }
      });

      return data.access_token;
    } catch (error) {
      this.logger.sLog({ error }, "UserService::getGithubAccessToken:: Error getting github access token");
    }

  }


  private async getGoogleUserDetails({ accessToken }: { accessToken: string }): Promise<GoogleOAuthUserDetails> {
    const { data: userData } = await axios({
      url: `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`,
    }) as { data: GoogleOAuthUserDetails };

    return userData;

  }

  private async getGithubUserDetails({ accessToken }: { accessToken: string }): Promise<any> {
    this.logger.debug("Getting github user details");

    const response = await axios({
      url: `https://api.github.com/user`,
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const { data: userData } = response;

    return userData;
  }

  async processGoogleCallback(req: Request, res: Response) {
    try {
      const googleConf = {
        clientId: "client id",
        clientSecret: "client secret",
        callBackUrl: `http://localhost:5000/api/google/callback`,
        clientAuthPath: `http://localhost:3000/auth/google`,
      }

      const accessToken = await this.getGoogleAccessToken({ code: req.query.code as string, conf: googleConf });

      const userData = await this.getGoogleUserDetails({ accessToken: accessToken });

      const user: ProcessThirdPartyLogin = {
        email: userData.email,
        firstName: userData.given_name,
        lastName: userData.family_name || "",
        accessToken,
        avatar_url: userData.picture,
        thirdPartyName: OAuthThirdPartyName.google,
      }

      const { token } = await this.processThirdPartyLogin(user);

      const clientRedirectURI = `${googleConf.clientAuthPath}?token=${token}`
      this.logger.debug("redirected back to client via google login");
      res.redirect(clientRedirectURI)
    } catch (err) {
      this.logger.warn(err.message)
      throw ("Error processing google callback");
    }
  }

  async processGithubCallback(req: Request, res: Response) {
    this.logger.sLog({ githubConf: this.githubAuthConf }, "UserService::processGithubCallBack");
    try {

      const accessToken = await this.getGithubAccessToken({ code: req.query.code as string, conf: this.githubAuthConf });

      const userData = await this.getGithubUserDetails({ accessToken: accessToken });


      const user: ProcessThirdPartyLogin = {
        email: userData.email,
        firstName: userData.name,
        lastName: userData.familyName || "",
        accessToken,
        avatar_url: userData.avatar_url,
        thirdPartyName: OAuthThirdPartyName.google,
      }

      const { token } = await this.processThirdPartyLogin(user);

      const clientRedirectURI = `${this.githubAuthConf.clientAuthPath}?token=${token}`
      this.logger.debug("redirected back to client");
      res.redirect(clientRedirectURI)
    } catch (err) {
      this.logger.warn(err.message)
      res.send("Github Login Failed")
    }
  }

  async processThirdPartyLogin({ email, firstName, accessToken, lastName, avatar_url, thirdPartyName }: ProcessThirdPartyLogin): Promise<any> {
    this.logger.sLog({ email, firstName, accessToken, avatar_url, thirdPartyName }, "UserService::processThirdPartyLogin:: processing third party login");

    const user = {
      email,
      firstName,
      lastName,
      accessToken,
    }

    const userDetails = await this.getUser({ email });

    const registered = Boolean(userDetails);

    let token: string;

    if (registered) {
      token = generateJWTToken({ details: userDetails });
    }

    if (!registered) {
      const userDetails = await this.register({
        email: user.email,
        password: v4(),
        picture: avatar_url,
        firstName,
        lastName
      });

      token = generateJWTToken({ details: userDetails });
    }

    this.logger.sLog({ registered }, `UserService::processThirdPartyLogin:: validating ${thirdPartyName} profile`);

    return { token };
  }
}

