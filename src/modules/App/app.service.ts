import { serverName } from '@/config/resources/server';
import { ServerMessage } from '@/types';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
   getHello(): ServerMessage {
      return {
         hi: `Hi,I am a server for the ${serverName}, the Giant`,
         knowMore: '/docs',
      };
   }
}
