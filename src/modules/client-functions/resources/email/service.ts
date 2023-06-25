import * as postmark from 'postmark';
import { CustomLoggerInstance as Logger } from '@/modules/logger/logger.service';
import { promises as fs } from 'fs';
import {
   EmailTemplateDetails,
   EmailTemplate,
   EmailParty,
} from '../utils/email/types';
import stringInject from '@/utils/stringInject';

export const sendEmail = async (args: {
   recipient: EmailParty;
   sender: EmailParty;
   templateType: EmailTemplate;
   variables: Record<string, any>;
   customSubject?: string;
   apiKey: string;
   logger: typeof Logger;
   config: {
      officialName: string;
      companyName: string;
      companyAddress: string;
      presentYear: string;
   };
   templateLocation: string;
}): Promise<any> => {
   const {
      recipient,
      templateType,
      variables,
      customSubject,
      apiKey,
      logger,
      config,
      sender,
      templateLocation,
   } = args;
   const commonData = {
      siteName: config.officialName,
      recipientName: recipient.name,
      companyName: config.companyName,
      companyAddress: config.companyAddress,
      presentYear: config.presentYear,
   };
   const {
      subject = customSubject,
      htmlContent,
      textContent,
   } = await getDetailsFromTemplate(templateLocation, templateType, {
      ...commonData,
      ...variables,
   });
   logger.debug(
      `Sending Email ${JSON.stringify({ to: recipient.email, subject })}`,
   );
   const postMarkMailCarrier = new postmark.Client(apiKey);

   const res = await postMarkMailCarrier.sendEmail({
      From: sender.email,
      To: recipient.email,
      Subject: subject,
      TextBody: textContent,
      HtmlBody: htmlContent,
   });
   logger.debug(
      `Email Sent, ${JSON.stringify({ to: recipient.email, subject })}`,
   );
   return res;
};

const getDetailsFromTemplate = async (
   templateLocation: string,
   templateType: EmailTemplate,
   data: Record<string, any>,
) => {
   const result = {} as EmailTemplateDetails;
   const [htmlContent, textContent, docsContent] = await getEmailContent(
      templateLocation,
      templateType,
   );
   const docs = JSON.parse(docsContent);
   result.subject = stringInject(
      docs.title,
      { siteName: data.siteName },
      docs.variableExpression,
   );
   result.htmlContent = stringInject(
      htmlContent,
      data,
      docs.variableExpression,
   );
   result.textContent = stringInject(
      textContent,
      data,
      docs.variableExpression,
   );
   return result;
};

const getTemplateFileLocation = (
   templateLocation: string,
   templateType: EmailTemplate,
) => {
   return {
      html: `${templateLocation}/${templateType}/index.html`,
      txt: `${templateLocation}/${templateType}/index.txt`,
      docs: `${templateLocation}/${templateType}/docs.json`,
   };
};

const getEmailContent = async (
   templateLocation: string,
   templateType: EmailTemplate,
) => {
   const templateFiles = getTemplateFileLocation(
      templateLocation,
      templateType,
   );
   const content = await Promise.all([
      fs.readFile(templateFiles.html, 'binary'),
      fs.readFile(templateFiles.txt, 'binary'),
      fs.readFile(templateFiles.docs, 'binary'),
   ]);
   return content;
};
