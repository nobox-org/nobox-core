import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { generateJWTToken, verifyJWTToken } from '@/utils/jwt';
import { CustomLogger as Logger } from '@/modules/logger/logger.service';
import { throwBadRequest } from '@/utils/exceptions';
import axios from 'axios';
import { generateGoogleOAuthLink } from '@/utils/google-oauth-link';
import {
   GoogleOAuthUserDetails,
   ProcessThirdPartyLogin,
   OAuthThirdPartyName,
   AuthConfDetails,
} from '@/types';
import { generateGithubOAuthLink } from '@/utils/github-oauth-link';
import { v4 } from 'uuid';
import { Request, Response } from 'express';
import {
   GITHUB_CALLBACK_URL,
   CLIENT_AUTH_PATH,
   GITHUB_CLIENT_ID,
   GITHUB_CLIENT_SECRET,
   GOOGLE_CALLBACK_URL,
   GOOGLE_CLIENT_ID,
   GOOGLE_CLIENT_SECRET,
} from '@/config/resources/process-map';
import {
   AuthCheckInput,
   AuthCheckResponse,
   CustomCallback,
} from './types';
import {
   AUTHORIZATION_ERROR,
   USER_NOT_FOUND,
} from '@/utils/constants/error.constants';
import { generateApiKey } from '@/utils/gen';
import { ApiToken, MUser } from '@nobox-org/shared-lib';
import { CreateLocalUserDto, LoginLocalUserDto } from './dto';




@Injectable()
export class AuthService {
   private githubAuthConf: AuthConfDetails = {
      clientId: GITHUB_CLIENT_ID,
      clientSecret: GITHUB_CLIENT_SECRET,
      callBackUrl: GITHUB_CALLBACK_URL
   };

   private googleAuthConf: AuthConfDetails = {
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callBackUrl: GOOGLE_CALLBACK_URL,
   };



   constructor(private userService: UserService, private logger: Logger) { }

   async getEternalToken({ token }: AuthCheckInput): Promise<ApiToken> {
      this.logger.sLog({}, 'authService:getEternalToken');
      const { userDetails } = verifyJWTToken(token) as Record<string, any>;

      const user = await this.userService.getUserDetails({ email: userDetails.email }, {
         throwIfNotFound: true
      });

      if (user.apiToken) {
         return user.apiToken;
      };

      const apiKey = generateApiKey();
      const apiKeyPayload: ApiToken = {
         createdOn: new Date(),
         expired: false,
         token: apiKey,
      };

      await this.userService.update({
         query: { email: user.email },
         update: {
            $set: {
               apiToken: apiKeyPayload
            }
         }
      });

      return apiKeyPayload;
   }

   async authCheck({ token }: AuthCheckInput): Promise<AuthCheckResponse & { userDetails?: MUser }> {
      this.logger.sLog({ token }, 'AuthService:authCheck');
      try {

         const user = await this.userService.getUserDetails({
            "apiToken.token": token
         });

         const result = {
            expired: user.apiToken.expired,
            userNotFound: false,
         };

         return {
            ...result,
            invalid: result.expired || result.userNotFound,
            userDetails: user
         };
      } catch (error) {
         this.logger.sLog({ error }, 'AuthService:authCheck:error');
         const result = {
            expired: error.response.error?.[0] === AUTHORIZATION_ERROR,
            userNotFound:
               error.response.error?.[0] === AUTHORIZATION_ERROR
                  ? null
                  : error.response.error === USER_NOT_FOUND,
         };

         return {
            ...result,
            invalid: result.expired || result.userNotFound,
         };
      }
   }

   async redirectToGoogleOauth(_: Request, res: Response) {
      this.logger.debug('redirect to google oauth');
      const uri = generateGoogleOAuthLink({
         clientId: this.googleAuthConf.clientId,
         redirectUri: this.googleAuthConf.callBackUrl,
         // scope: ['email', 'profile'],
         // authType: 'rerequest',
         // display: 'popup',
         // responseType: 'code',
      });

      this.logger.sLog({ uri }, 'Redirecting to Google login');

      return res.redirect(uri);
   }

   async redirectToGithubOauth(req: Request, res: Response) {
      this.logger.debug('redirecting to github oauth');

      const customCallbackProps:CustomCallback = {
         callback_url: req.query.callback_url as string,
         callback_client: req.query.callback_client as string
      }

      const redirectUri = `${this.githubAuthConf.callBackUrl}?callback_url=${customCallbackProps.callback_url}&callback_client=${customCallbackProps.callback_client}`

      this.logger.debug(
         "Custom callback url = " + customCallbackProps.callback_url + ', ' +
         "Custom callback client = " + customCallbackProps.callback_client, redirectUri);

      const uri = generateGithubOAuthLink({
         clientId: this.githubAuthConf.clientId,
         redirectUri: redirectUri,
         scope: ['user'],
      });

      this.logger.sLog({ uri }, 'Redirecting to Github login');

      return res.redirect(uri);
   }

   private async getGoogleAccessToken({
      code,
      conf,
   }: {
      code: string;
      conf: AuthConfDetails;
   }) {
      try {
         this.logger.debug('getting google access token');

         const params = {
            client_id: conf.clientId,
            client_secret: conf.clientSecret,
            redirect_uri: conf.callBackUrl,
            code,
            grant_type: 'authorization_code',
         };

         const data = await axios({
            url: 'https://oauth2.googleapis.com/token',
            method: 'POST',
            params,
            headers: {
               "Content-Type": "application/x-www-form-urlencoded",
            }
         });

         const {
            data: { access_token: accessToken },
         } = data;

         return accessToken;
      } catch (error) {
         this.logger.warn('Error getting google access token' + error.message);
         throwBadRequest('Something went wrong, please try again');
      }
   }

   private async getGithubAccessToken({
      code,
      conf,
   }: {
      code: string;
      conf: AuthConfDetails;
   }) {
      try {
         this.logger.debug('getting github access token');

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
               Accept: 'application/json',
            },
         });

         if (data.error) {
            this.logger.sLog(
               { data },
               'UserService:getGithubAccessToken:: Error getting github access token',
            );
            throwBadRequest(data.error_description);
         }

         return data.access_token;
      } catch (error) {
         this.logger.sLog(
            { error },
            'UserService::getGithubAccessToken:: Error getting github access token',
         );
         throwBadRequest(error);
      }
   }

   private async getGoogleUserDetails({
      accessToken,
   }: {
      accessToken: string;
   }): Promise<GoogleOAuthUserDetails> {
      const { data: userData } = (await axios({
         url: `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`,
      })) as { data: GoogleOAuthUserDetails };

      return userData;
   }

   private async getGithubUserDetails({
      accessToken,
   }: {
      accessToken: string;
   }): Promise<any> {
      this.logger.debug('Getting github user details');

      const [{ data: emails }, { data: details }] = await Promise.all([
         axios({
            url: `https://api.github.com/user/emails`,
            headers: {
               Authorization: `Bearer ${accessToken}`,
            },
         }),
         axios({
            url: `https://api.github.com/user`,
            headers: {
               Authorization: `Bearer ${accessToken}`,
            },
         }),
      ]);

      return {
         email: emails[0].email,
         avatar_url: details.avatar_url,
         firstName: details.name || details.login,
      };
   }

   async processGoogleCallback(req: Request, res: Response) {

      this.logger.sLog(
         { googleAuthConf: this.googleAuthConf },
         'UserService::processGoogleCallBack',
      );

      try {
         const accessToken = await this.getGoogleAccessToken({
            code: req.query.code as string,
            conf: this.googleAuthConf,
         });

         const userData = await this.getGoogleUserDetails({
            accessToken,
         });

         const user: ProcessThirdPartyLogin = {
            email: userData.email,
            firstName: userData.given_name,
            lastName: userData.family_name || '',
            accessToken,
            avatar_url: userData.picture,
            thirdPartyName: OAuthThirdPartyName.google,
         };

         return this.processThirdPartyLogin(user, res);
      } catch (err) {
         this.logger.warn(err.message);
         throw 'Error processing google callback';
      }
   }

   async processGithubCallback(req: Request, res: Response) {
      this.logger.sLog(
         { githubConf: this.githubAuthConf },
         'UserService::processGithubCallBack',
      );

      const customCallbackProps:CustomCallback = {
         callback_url: req.query.callback_url as string,
         callback_client: req.query.callback_client as string
      }
      
      try {
         const accessToken = await this.getGithubAccessToken({
            code: req.query.code as string,
            conf: this.githubAuthConf,
         });

         const userData = await this.getGithubUserDetails({
            accessToken: accessToken,
         });

         const user: ProcessThirdPartyLogin = {
            ...userData,
            accessToken,
            thirdPartyName: OAuthThirdPartyName.github,
         };

         return this.processThirdPartyLogin(user, res, customCallbackProps);
      } catch (err) {
         this.logger.sLog(
            err.message,
            'UserService: ProcessGithubCallback:: Error processing github callback',
         );
         res.send('Github Login Failed');
      }
   }

   async processThirdPartyLogin({
      email,
      firstName,
      accessToken,
      lastName,
      avatar_url,
      thirdPartyName,
   }: ProcessThirdPartyLogin, res: Response, customCallbackProps?:CustomCallback): Promise<any> {
      this.logger.sLog(
         { email, firstName, accessToken, avatar_url, thirdPartyName },
         'AuthService::processThirdPartyLogin:: processing third party login',
      );

      let userDetails = await this.userService.getUserDetails({ email }, { throwIfNotFound: false });

      if (!userDetails) {
         this.logger.sLog(
            {},
            'UserService::processThirdPartyLogin:: User not found',
         );

         userDetails = await this.userService.register({
            email,
            password: v4(),
            picture: avatar_url,
            firstName,
            lastName,
         });
      }

      return this.redirectToClientWithAuthToken({ userDetails, res, customCallbackProps });
   }

   async registerWithDirectEmail(createLocalUserDto: CreateLocalUserDto): Promise<any> {
      this.logger.sLog(
         { email: createLocalUserDto.email },
         'AuthService::register:: processing direct email registration',
      );

      const userDetails = await this.userService.register(createLocalUserDto, {
         disableUserExistenceCheck: true
      });

      const { token } = await this.getClientAuthToken({ userDetails });

      return { token };
   }

   async loginWithDirect(loginLocalUserDto: LoginLocalUserDto): Promise<any> {
      this.logger.sLog(
         { email: loginLocalUserDto.email },
         'AuthService::login:: processing direct email login',
      );
      const userDetails = await this.userService.getUserDetails(loginLocalUserDto, { throwIfNotFound: false });
      if (!userDetails) {
         throw new HttpException(
            {
               error: "Username or Password incorrect"
            },
            HttpStatus.BAD_REQUEST,
         );
      }

      return this.getClientAuthToken({ userDetails });
   }

   private async getClientAuthToken(args: { userDetails: MUser; }) {
      this.logger.sLog({}, "AuthService::clientAuthToken")
      const { userDetails } = args;
      const token = generateJWTToken({ details: userDetails });
      return { token }
   }

   private async redirectToClientWithAuthToken(args: { userDetails: MUser; res: Response, customCallbackProps?:CustomCallback }) {
      this.logger.sLog({}, "AuthService::redirectToClientWithAuthToken");
      const { token } = await this.getClientAuthToken(args);

      this.logger.sLog(args.customCallbackProps, 'Custom callback props');

      const query = `token=${token}${args.customCallbackProps.callback_client && '&callback_client=' + args.customCallbackProps.callback_client}`;
      const clientRedirectURI = `${args.customCallbackProps?.callback_url || CLIENT_AUTH_PATH}?${query}`;
      this.logger.sLog({ clientRedirectURI }, 'redirected back to client');
      args.res.redirect(clientRedirectURI);
   }
}
