import { Global, Module } from '@nestjs/common';
import { UserService } from './user.service';
import { FileModule } from '../file/file.module';
import { MailModule } from '../mail/mail.module';
import { UserResolver } from './user.resolver';
import { UserController } from './user.controller';

@Global()
@Module({
  controllers: [UserController],
  imports: [
    FileModule,
    MailModule
  ],
  providers: [
    UserService,
    UserResolver],
  exports: [UserService],
})
export class UserModule { }
