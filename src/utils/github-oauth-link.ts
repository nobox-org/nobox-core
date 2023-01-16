import * as queryString from "query-string";

export type GithubOAuthScope = "user";
export interface GithubOAuthLinkParams {
    clientId: string;
    redirectUri: string;
    scope: Array<GithubOAuthScope>;
}

/**
 * 
 * @param param GoogleOAuthLinkParams
 * @returns string
 */

export const generateGithubOAuthLink = ({
    clientId,
    redirectUri,
    scope,
}: GithubOAuthLinkParams) => {

    const queryParams = queryString.stringify({
        client_id: clientId,	//Required.The client ID you received from GitHub when you registered.
        redirect_uri: redirectUri,	//The URL in your application where users will be sent after authorization.See details below about redirect urls.
        scope, //	A space- delimited list of scopes.If not provided, scope defaults to an empty list for users that have not authorized any scopes for the application.For users who have authorized scopes for the application, the user won't be shown the OAuth authorization page with the list of scopes. Instead, this step of the flow will automatically complete with the set of scopes the user has authorized for the application. For example, if a user has already performed the web flow twice and has authorized one token with user scope and another token with repo scope, a third web flow that does not provide a scope will receive a token with user and repo scope.
        //login: ""	Suggests a specific account to use for signing in and authorizing the app.
        //state	string	An unguessable random string.It is used to protect against cross - site request forgery attacks.
    });

    return `https://github.com/login/oauth/authorize?${queryParams}`;
}