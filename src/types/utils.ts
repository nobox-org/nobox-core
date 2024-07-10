export interface SendMessageConfig {
    body: string;
    to: string;
    from?: string;
}

export interface SendMailConfig {
    subject: string;
    body: string;
    to: string;
    from?: string;
}
