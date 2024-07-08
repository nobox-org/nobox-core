import {
    POSTMARK_SERVER_TOKEN,
} from '@/config/resources/process-map';
import { Message, ServerClient } from 'postmark';
import { MessageSendingResponse } from 'postmark/dist/client/models';


// export const mailSender = new ServerClient(POSTMARK_SERVER_TOKEN);

export default class MailSender {

    private static service = new ServerClient(POSTMARK_SERVER_TOKEN);

    static async send(email: Message): Promise<MessageSendingResponse> {
        return MailSender.service.sendEmail(email);
    }
}
