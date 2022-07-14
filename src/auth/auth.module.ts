import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserModule } from '../user/user.module';
import { LoggerModule } from '../logger/logger.module';
import { AuthResolver } from '../auth/auth.resolver';

@Module({
  imports: [UserModule, LoggerModule],
  providers: [AuthService, AuthResolver],
})
export class AuthModule {}
