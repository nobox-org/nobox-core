import { Global, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Global()
@Module({
   controllers: [AuthController],
   providers: [AuthService],
   exports: [AuthService]
})
export class AuthModule { }
