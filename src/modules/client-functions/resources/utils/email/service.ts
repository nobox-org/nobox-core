import * as postmark from "postmark";
import { CustomLoggerInstance as Logger } from "@/modules/logger/logger.service";
import { promises as fs } from 'fs';
import { EmailTemplateDetails, EmailTemplate, EmailParty } from './types';
import stringInject from '@/utils/stringInject';


const templateLocation = __dirname + "/templates";
export const sendEmail = async (args: {
  recipient: EmailParty,
  sender: EmailParty,
  templateType: EmailTemplate,
  variables: Record<string, any>,
  customSubject?: string,
  apiKey: string,
  logger: typeof Logger;
}
): Promise<any> => {
  const { recipient, templateType, variables, customSubject, apiKey, logger, sender } = args;
  logger.sLog({ recipient, templateType, variables, customSubject, apiKey }, "utils::email::service::sendEmail");

  try {
    const { subject = customSubject, htmlContent, textContent } = await getDetailsFromTemplate(templateType, variables);
    logger.debug(`Sending Email ${JSON.stringify({ to: recipient.email, subject })}`);
    const postMarkMailCarrier = new postmark.ServerClient(apiKey);
    logger.sLog({ sender, recipient, subject, textContent, htmlContent, variables }, "utils::email::service::sendEmail: about to run postmark request")
    //Sender Email must be the same as set from Postmark   
    const res = await postMarkMailCarrier.sendEmail({
      "From": sender.email,
      "To": recipient.email,
      "Subject": subject,
      "TextBody": textContent,
      "HtmlBody": htmlContent,
      "MessageStream": "outbound"
    });
    logger.debug(`Email Sent, ${JSON.stringify({ to: recipient.email, subject })}`);
    return res;
  } catch (error) {
    logger.sLog({ recipient, templateType, variables, customSubject, apiKey }, `Error sending email ${JSON.stringify({ error })}`);
    throw error;
  }
}


const getDetailsFromTemplate = async (templateType: EmailTemplate, data: Record<string, any>) => {
  const result = {} as EmailTemplateDetails;
  const [htmlContent, textContent, docsContent] = await getEmailContent(templateType);
  const { variableExpression, title } = JSON.parse(docsContent);
  result.subject = stringInject(title, data, variableExpression);
  result.htmlContent = stringInject(htmlContent, data, variableExpression);
  result.textContent = stringInject(textContent, data, variableExpression);
  return result;
}


const getTemplateFileLocation = (templateType: EmailTemplate) => {
  return {
    html: `${templateLocation}/${templateType}/index.html`,
    txt: `${templateLocation}/${templateType}/index.txt`,
    docs: `${templateLocation}/${templateType}/docs.json`,
  }
}

const getEmailContent = async (templateType: EmailTemplate) => {
  const templateFiles = getTemplateFileLocation(templateType);
  return Promise.all([fs.readFile(templateFiles.html, 'binary'), fs.readFile(templateFiles.txt, 'binary'), fs.readFile(templateFiles.docs, 'binary')]);
}