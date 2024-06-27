import { CustomLogger as Logger } from '@/modules/logger/logger.service';
import { MLogs, UpdateFilter, getLogsModel } from 'nobox-shared-lib';
import { Context } from '@/types';

export class LogTrackerStoreService {
   private logModel: ReturnType<typeof getLogsModel>;

   constructor(
      private logger: Logger,
   ) {
      this.logModel = getLogsModel(this.logger);
   }

   async get(context: Context["req"]) {
      this.logModel.find({

      });
   }

   async addUserId(requestId: string, userId: string) {


      this.logger.sLog({ requestId, userId }, 'LogTrackerService:AddUserId: add user id to log persistence', "bgCyanBright");

      this.logModel.findOneAndUpdate({ requestId }, {
         $set: {
            stage: 'updated',
            userId
         }
      });
   }

   async addMoreData(requestId: string, data: {
      project: {
         id: string;
         slug: string;
      },
      recordSpace: {
         id: string;
         slug: string;
      }
   }) {


      this.logger.sLog({ requestId, data }, 'LogTrackerService:AddMoreData: add more data to log persistence', "bgCyanBright");

      const { project, recordSpace } = data;

      this.logModel.findOneAndUpdate({ requestId }, {
         $set: {
            project,
            recordSpace
         }
      });
   }

   async finalise(requestId: string, data: UpdateFilter<MLogs>) {

      this.logger.sLog({ requestId }, 'LogTrackerService:Finalise: finalise log persistence', "bgCyanBright");

      this.logModel.findOneAndUpdate({ requestId }, {
         $set: data
      });
   }
}
