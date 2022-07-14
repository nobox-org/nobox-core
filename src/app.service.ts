import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServerMessage } from './types';

@Injectable()
export class AppService {

  private serverName;

  constructor(private configService: ConfigService) {
    this.serverName = this.configService.get('serverConfig').serverName;
  }

  getHello(): ServerMessage {
    return { hi: 'Hi,I am a server for the third project, the Giant', knowMore: '/docs' };
  }
}
