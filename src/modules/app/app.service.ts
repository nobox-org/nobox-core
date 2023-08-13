import { serverName } from '@/config/resources/server';
import { HealthCheckMessage, ServerMessage } from '@/types';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
   getHello(): ServerMessage {
      return {
         hi: `Hi,I am a server for the ${serverName}, the Giant`,
         knowMore: '/docs',
      };
   }

   getStatus(): HealthCheckMessage {
      return {
         status: 'healthy',
         timestamp: new Date()
      };
   }
}
