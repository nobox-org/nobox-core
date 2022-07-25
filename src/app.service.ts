import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServerMessage } from './types';

@Injectable()
export class AppService {

  private serverName: string;

  constructor(private configService: ConfigService) {
    this.serverName = this.configService.get('serverConfig').serverName;
  }

  getHello(): ServerMessage {
    return { hi: `Hi,I am a server for the ${this.serverName}, the Giant`, knowMore: '/docs' };
  }
}
