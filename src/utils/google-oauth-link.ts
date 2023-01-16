import * as queryString from "query-string";

type GoogleOAuthScope = "email" | "profile" | "openid";
interface GoogleOAuthLinkParams {
    clientId: string;
    redirectUri: string;
    scope: Array<GoogleOAuthScope>;
    authType: "rerequest";
    display: "popup";
    responseType: "code";
}

/**
 * 
 * @param param GoogleOAuthLinkParams
 * @returns string
 */

export const generateGoogleOAuthLink = ({
    clientId,
    redirectUri,
    scope,
    authType,
    display,
    responseType
}: GoogleOAuthLinkParams) => {

    const queryParams = queryString.stringify({
        client_id: clientId, // It must correspond to what we declared earlier in the backend
        scope: scope.join(" "), // This is the user data you have access to, in our case its just the mail.
        redirect_uri: redirectUri, // This is the uri that will be redirected to if the user signs into his google account successfully
        auth_type: authType, // This tells the consent screen to reappear if the user initially entered wrong credentials into the google modal
        display, //It pops up the consent screen when the anchor tag is clicked
        response_type: responseType // This tells Google to append code to the response which will be sent to the backend which exchange the code for a token
    });

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${queryParams}`;

    return url;

}