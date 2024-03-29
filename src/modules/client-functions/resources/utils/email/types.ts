export enum EmailTemplate {
   CONFIRM_ACCOUNT = 'confirm-account',
   FORGOT_PASSWORD = 'forgot-password',
   INVITE_USER = 'invite-user',
   CONFIRM_ACCOUNT_BY_SHORT_CODE = 'confirm-account-by-short-code',
   CARD_CREATION_NOTIFICATION = 'card-creation-notification',
   REMITTANCE = 'remittance',
   GENERIC_EMAIL = 'generic-email',
   ERROR_NOTIFICATION = 'error-notification',
   OTP = 'otp',
}

export interface EmailTemplateDetails {
   subject: string;
   htmlContent: string;
   textContent: string;
}

export interface EmailTemplateExtra {
   confirmAccountToken?: string;
   forgotPasswordToken?: string;
   confirmationShortCode?: string;
   invitedUser?: string;
   channelInvitedTo?: {
      name: string;
      description: string;
   };
   invitedBy?: string;
}

export type EmailParty = {
   name?: string;
   email: string;
};

export enum TemplateFileEnum {
   HTML = 'html',
   TXT = 'txt',
   DOCS = 'docs',
}
