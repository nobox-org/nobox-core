import { Injectable } from '@nestjs/common';
import { MAIL_API_KEY, MAIL_FROM } from '@/config/resources/process-map';
import { MailApp } from '@/utils/send-mail';
import { CustomLogger as Logger } from '@/modules/logger/logger.service';
import { throwBadRequest } from '@/utils/exceptions';

@Injectable()
export class EmailService {
    constructor(private logger: Logger) {
        MailApp.setup(MAIL_API_KEY);
    }


    async sendEmail(to:string, subject:string, text:string, html:string) {
        
        const msg = {
            to,
            from: MAIL_FROM,
            subject,
            text,
            html
        };

        this.logger.sLog({ ...msg }, 'EmailService:sendMail');

        try {
            await MailApp.send(msg);
            return {
                sent_to: to,
                from: MAIL_FROM,
                sent: true
            }
        } catch (error) {
            this.logger.warn('Error sending mail' + error.message);
            if (error.response) {
                this.logger.debug("MailApp Response:", error.response.body);
            }
            throwBadRequest('Something went wrong, please try again');
        }
    }
}
