import { NodeMailgun } from 'ts-mailgun';
import * as postmark from "postmark";
import { Twilio } from "twilio";
import * as messageBird from "messagebird";
import * as firebaseAdmin from "firebase-admin";
import { promises as fs } from 'fs';
import { firebaseCredentials } from './firebaseCredentials';
import { CustomLogger as Logger } from '@/logger/logger.service';
import { mailConfig, officialConfig } from '../config';
import { EmailTemplateDetails, EmailTemplate, EmailRecipient, MailServerChoiceEnum, SMSServerChoiceEnum } from './types';
import stringInject from '@/utils/stringInject';
import axios, { AxiosInstance } from 'axios';
import { throwBadRequest } from '@/utils/exceptions';
import { Injectable, Scope } from '@nestjs/common';
import { MessagingPayload } from 'firebase-admin/lib/messaging/messaging-api';

firebaseAdmin.initializeApp({ credential: firebaseAdmin.credential.cert({ projectId: firebaseCredentials.project_id, clientEmail: firebaseCredentials.client_email, privateKey: firebaseCredentials.private_key }) });

@Injectable({ scope: Scope.REQUEST })
export class MailService {
  constructor(private logger: Logger) {
    this.mailType = mailConfig.MAIL_SERVER_CHOICE;
    this.smsType = mailConfig.SMS_SERVER_CHOICE;
    this.domainName = mailConfig.MAIL_DOMAIN;
    this.templateLocation = __dirname + '/templates';
    this.apiKey = mailConfig.MAIL_API_KEY;
    this.firebaseAdmin = firebaseAdmin;
  }

  private MailGunMailCarrier: any;
  private PostMarkMailCarrier: any;
  private TwilioSmsCarrier: any;
  private TermiiSmsCarrier: AxiosInstance;
  private MessageBirdSmsCarrier: any;
  private mailType: MailServerChoiceEnum;
  private smsType: SMSServerChoiceEnum;
  private domainName: string;
  private templateLocation: string;
  private apiKey: string;
  private firebaseAdmin: typeof firebaseAdmin;

  public async sendPushNotifications({ registrationToken, message, topic, sendToAllUsers = false }: { registrationToken?: string, message: MessagingPayload, topic?: string, sendToAllUsers?: boolean }) {
    try {
      const firebaseMessaging = this.firebaseAdmin.messaging();
      const response = await (sendToAllUsers ? firebaseMessaging.sendToTopic(mailConfig.FIREBASE_ALL_USERS_TOPIC, message) : topic ? firebaseMessaging.sendToTopic(topic, message) : firebaseMessaging.sendToDevice(registrationToken, message));
      this.logger.sLog({ response, topic, sendToAllUsers }, "MailService:sendNotifications");
      return true;
    } catch (error) {
      this.logger.sLog({ error, topic, sendToAllUsers }, "MailService:sendNotifications:error");
      return false;
    }
  }

  public async addToFirebaseTopic(registrationToken: string, topic: string) {
    try {
      const firebaseMessaging = this.firebaseAdmin.messaging();
      const response = await firebaseMessaging.subscribeToTopic(registrationToken, topic);
      this.logger.sLog({ response }, "MailService:addToFireBaseTopic");
    } catch (error) {
      this.logger.debug(error, "MailService:addToFireBaseTopic:error");
    }
  }

  private async initializeMail(subject?: string) {
    return {
      [MailServerChoiceEnum.MAILGUN]: () => {
        if (!subject) {
          throw 'Subject needs to be set for MailGun Initialization'
        }
        this.MailGunMailCarrier = new NodeMailgun();
        this.MailGunMailCarrier.apiKey = this.apiKey;
        this.MailGunMailCarrier.domain = this.domainName;
        this.MailGunMailCarrier.fromEmail = mailConfig.MAIL_SENDER_EMAIL;
        this.MailGunMailCarrier.fromTitle = subject
        this.MailGunMailCarrier.init();

      },
      [MailServerChoiceEnum.POSTMARK]: () => {
        this.PostMarkMailCarrier = new postmark.Client(mailConfig.POSTMARK_API_KEY);
      }
    }[this.mailType]();
  }

  private async initializeSMS() {
    this.logger.log("initialize SMS");
    return {
      [SMSServerChoiceEnum.TERMII]: () => {
        this.TermiiSmsCarrier = axios.create({
          baseURL: mailConfig.TERMII_BASE_URL + "/api/sms/otp/send",
          timeout: 10000,
          headers: { 'content-type': 'application/json' }
        });
      },
      [SMSServerChoiceEnum.MESSAGEBIRD]: () => {
        this.MessageBirdSmsCarrier = (messageBird as any)(mailConfig.MESSAGEBIRD_API_KEY).messages;
      },
      [SMSServerChoiceEnum.TWILIO]: () => {
        this.TwilioSmsCarrier = new Twilio(mailConfig.TWILIO_ACCOUNT_SID, mailConfig.TWILIO_AUTH_TOKEN);
      }
    }[this.smsType]();
  }

  private async sendMailByCarrier({ recipient, subject, htmlContent, textContent }, directCall = false) {
    if (directCall) {
      await this.initializeMail(subject);
    }
    return {
      [MailServerChoiceEnum.MAILGUN]: () => this.MailGunMailCarrier.send(recipient.email, subject, htmlContent),
      [MailServerChoiceEnum.POSTMARK]: () => this.PostMarkMailCarrier.sendEmail({
        "From": mailConfig.MAIL_SENDER_EMAIL,
        "To": recipient.email,
        "Subject": subject,
        "TextBody": textContent,
        "HtmlBody": htmlContent
      })
    }[this.mailType]();
  }

  public async sendSMS({ phoneNumber, message }: { phoneNumber: string, message: string }) {
    phoneNumber = "+" + phoneNumber;

    this.logger.sLog({ phoneNumber, message }, `Sending SMS`);
    await this.initializeSMS();
    return {
      [SMSServerChoiceEnum.TERMII]: async () => {
        try {
          this.logger.debug("Sending Via Termii");
          await this.TermiiSmsCarrier.post('', {
            body: JSON.stringify({
              "to": phoneNumber,
              "from": "TheThird",
              "sms": message,
              "type": "plain",
              "api_key": mailConfig.TERMII_API_KEY,
              "channel": "generic",
            })
          })
        } catch (error) {
          this.logger.debug(error);
          throwBadRequest('Something Unexpected Happened')
        }
      },
      [SMSServerChoiceEnum.TWILIO]: async () => {
        try {
          this.logger.debug("Sending Via Twilio");
          this.TwilioSmsCarrier.messages.create({
            body: message,
            messagingServiceSid: mailConfig.TWILIO_MESSAGING_SERVICE_SID,
            to: phoneNumber
          }).then((message: string) => this.logger.sLog({ message }, "Sent SMS"));
        } catch (error) {
          this.logger.debug(error);
          throwBadRequest('Something Unexpected Happened')
        }
      },
      [SMSServerChoiceEnum.MESSAGEBIRD]: () => {
        try {
          this.logger.debug("Sending Via MessageBird");
          this.MessageBirdSmsCarrier.create({
            'originator': 'TheThird',
            'recipients': [phoneNumber],
            'body': message
          },
            (err, response) => {
              if (err) {
                this.logger.sLog(err, 'mailService:sendSms:error:messageBird');
              } else {
                this.logger.sLog(response, 'mailService:sendSms:success:messageBird')
              }
            });

        } catch (error) {
          this.logger.debug(error);
          throwBadRequest('Something Unexpected Happened')
        }
      }
    }[this.smsType]();
  }


  public async send(
    recipient: EmailRecipient,
    templateType: EmailTemplate,
    variables: Record<string, any>,
    customSubject?: string,
  ): Promise<any> {
    try {
      const commonData = {
        siteName: officialConfig.officialName,
        recipientName: recipient.name,
        companyName: officialConfig.companyName,
        companyAddress: officialConfig.companyAddress,
        presentYear: officialConfig.presentYear
      };
      const { subject = customSubject, htmlContent, textContent } = await this.getDetailsFromTemplate(templateType, {
        ...commonData,
        ...variables
      });
      this.logger.debug(`Sending Email ${JSON.stringify({ to: recipient.email, subject })}`);
      await this.initializeMail(subject);
      const res = await this.sendMailByCarrier({ recipient, subject, htmlContent, textContent });
      this.logger.debug(`Email Sent, ${JSON.stringify({ to: recipient.email, subject, medium: this.mailType })}`);
      return res;
    } catch (error) {
      this.logger.debug(`courier.service: send: ${error}`)
    }
  }

  private getTemplateFileLocation(templateType: EmailTemplate) {
    return {
      html: `${this.templateLocation}/${templateType}/index.html`,
      txt: `${this.templateLocation}/${templateType}/index.txt`,
      docs: `${this.templateLocation}/${templateType}/docs.json`,
    }
  }

  private async getEmailContent(templateType: EmailTemplate) {
    const templateFiles = this.getTemplateFileLocation(templateType);
    const content = await Promise.all([fs.readFile(templateFiles.html, 'binary'), fs.readFile(templateFiles.txt, 'binary'), fs.readFile(templateFiles.docs, 'binary')]);
    return content;
  }

  public async getDetailsFromTemplate(templateType: EmailTemplate, data: Record<string, any>) {
    const result = {} as EmailTemplateDetails;
    const [htmlContent, textContent, docsContent] = await this.getEmailContent(templateType);
    const docs = JSON.parse(docsContent);
    result.subject = stringInject(docs.title, { siteName: data.siteName }, docs.variableExpression);
    result.htmlContent = stringInject(htmlContent, data, docs.variableExpression);
    result.textContent = stringInject(textContent, data, docs.variableExpression);
    return result;
  }
}
