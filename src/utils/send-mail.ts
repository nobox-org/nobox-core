// Mailer


export interface MailMessage{
    to: string,
    from: string,
    subject: string,
    text: string,
    html: string
}

export class MailApp {
    // TODO: Instantiate mail service

    static setup(apiKey: string) {
        // TODO: Implement setup for mail service
    }

    static async send(msg: MailMessage) {
        // TODO: Implement logic to send mail
    }
}
