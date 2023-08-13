import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { HealthCheckMessage, ServerMessage } from '@/types';

@Controller()
export class AppController {
    constructor(private readonly appService: AppService) { }

    @Get()
    getHello(): ServerMessage {
        return this.appService.getHello();
    }

    @Get("health")
    getStatus(): HealthCheckMessage {
        return this.appService.getStatus();
    }
}
