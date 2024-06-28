import { Module } from '@nestjs/common';
import { NotifyService } from './notify.service';
import { NotifyController } from './notify.controller';
import { AuthService } from '../auth/auth.service';

@Module({
    providers: [
        NotifyService,
        AuthService
    ],
    controllers: [NotifyController]
})
export class NotifyModule {}
