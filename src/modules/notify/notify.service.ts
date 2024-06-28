import { Injectable } from '@nestjs/common';

@Injectable()
export class NotifyService {
    async sendMail() {
    //   this.logger.sLog({}, 'ClientUtilsService::getEmbedding');
      return {
         message: 'This endpoint works'
      };
    }
}
