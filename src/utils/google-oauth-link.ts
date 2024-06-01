import * as queryString from "query-string";

// type GoogleOAuthScope = 'email' | 'profile' | 'openid';
interface GoogleOAuthLinkParams {
   clientId: string;
   redirectUri: string;
   scopes?: string[]; //Array<GoogleOAuthScope>;
   access_type?: string,
   response_type?: string,
   prompt?: string,
   // authType: 'rerequest';
   // display: 'popup';
   // responseType: 'code';
}

/**
 *
 * @param param GoogleOAuthLinkParams
 * @returns string
 */

export const generateGoogleOAuthLink = ({
   clientId,
   redirectUri,
   access_type = 'offline',
   response_type = 'code',
   prompt = 'consent',
   scopes = [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email"
   ],
   // scope,
   // authType,
   // display,
}: GoogleOAuthLinkParams) => {


   const queryParams = queryString.stringify({
      redirect_uri: redirectUri, // This is the uri that will be redirected to if the user signs into his google account successfully
      client_id: clientId,
      access_type,
      response_type,  // This tells Google to append code to the response which will be sent to the backend which exchange the code for a token
      prompt,
      scope: scopes.join(' '), // This is the user data you have access to, in our case its just the mail.
      // auth_type: authType, // This tells the consent screen to reappear if the user initially entered wrong credentials into the google modal
      // display, //It pops up the consent screen when the anchor tag is clicked
      // response_type: responseType, 
   });

   const url = `https://accounts.google.com/o/oauth2/v2/auth?${queryParams}`;

   return url;
};
