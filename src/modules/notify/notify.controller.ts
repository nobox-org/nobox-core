import { Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { NotifyService } from './notify.service';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('notify')
export class NotifyController {
    constructor(
      private readonly notificationService: NotifyService,
    ) { }

    @Post('mail')
    @ApiOperation({ summary: 'Endpoint to send email' })
    @HttpCode(HttpStatus.OK)
    sendMail() {
        return this.notificationService.sendMail();
    }
}
