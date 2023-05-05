import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthResolver } from '../auth/auth.resolver';
import { AuthController } from './auth.controller';

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthResolver],
})
export class AuthModule { }
