import { Module } from '@nestjs/common';
import { LoggerModule } from 'src/logger/logger.module';
import { MailResolver } from './mail.resolver';
import { MailService } from './mail.service';

@Module({
  imports: [LoggerModule],
  providers: [MailService, MailResolver],
  exports: [MailService],
})
export class MailModule { }
