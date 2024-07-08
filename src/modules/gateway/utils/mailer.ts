import {
    MAIL_API_KEY,
} from '@/config/resources/process-map';
import { Message, ServerClient } from 'postmark';
import { MessageSendingResponse } from 'postmark/dist/client/models';


// export const mailSender = new ServerClient(MAIL_API_KEY);

export default class MailSender {

    private static service = new ServerClient(MAIL_API_KEY);

    static async send(email: Message): Promise<MessageSendingResponse> {
        return MailSender.service.sendEmail(email);
    }
}
