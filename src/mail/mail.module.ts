import { Module } from '@nestjs/common';
import { MailResolver } from './mail.resolver';
import { MailService } from './mail.service';

@Module({
  providers: [MailService, MailResolver],
  exports: [MailService],
})
export class MailModule { }
