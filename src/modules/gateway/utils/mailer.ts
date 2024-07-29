import {
    POSTMARK_MAIL_API_KEY,
} from '@/config/resources/process-map';
import { Message, ServerClient } from 'postmark';
import { MessageSendingResponse } from 'postmark/dist/client/models';


export default class MailSender {

    private static service = new ServerClient(POSTMARK_MAIL_API_KEY);

    static async send(email: Message): Promise<MessageSendingResponse> {
        return MailSender.service.sendEmail({
            ...email,
            "MessageStream": "outbound"
        });
    }
}
