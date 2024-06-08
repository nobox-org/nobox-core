import { Body, Controller, Post } from '@nestjs/common';
import { EmailService } from './email.service';
import { SendMailDto } from './dto/send-mail.dto';

@Controller('email')
export class EmailController {
    constructor(private readonly emailService: EmailService) {}

    @Post("send")
    async sendEmail(@Body() body : SendMailDto) {
        const {to, subject, text, html} = body;
        return this.emailService.sendEmail(to, subject, text, html);
    }
}
