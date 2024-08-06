import { POSTMARK_MAIL_FROM } from "@/config/resources/process-map";
import MailSender from "./setup";
import { SendMailConfig } from "@/types/utils";

export async function sendMail(config:SendMailConfig) {
    await MailSender.send({
        From: POSTMARK_MAIL_FROM,
        To: config.to,
        Subject: config.subject,
        HtmlBody: config.body,
    });
}