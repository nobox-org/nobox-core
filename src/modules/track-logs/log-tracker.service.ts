import { Inject, Injectable, Scope } from '@nestjs/common';
import { CustomLogger as Logger } from '@/modules/logger/logger.service';
import { MLogs, UpdateFilter, getLogsModel } from 'nobox-shared-lib';
import { Context } from '@/types';
import { DASHBOARD_URL } from '@/config/resources/process-map';

@Injectable({ scope: Scope.REQUEST })
export class LogTrackerService {
   private logModel: ReturnType<typeof getLogsModel>;
   private isDashboardRequestBool: boolean;

   constructor(
      private logger: Logger,
      @Inject("REQUEST") private context?: Context,
   ) {
      this.logModel = getLogsModel(this.logger);

      if (context?.req) {
         this.isDashboardRequestBool = this.isDashboardRequest(context?.req);
         if (this.isDashboardRequestBool) {
            this.logger.sLog({}, 'LogTrackerService:: identified dashboard request');
            return;
         }

         this.init(context?.req);
      }

   }

   private isDashboardRequest(contextReq: Context["req"]) {
      const { trace } = contextReq;
      return trace.origin === DASHBOARD_URL;
   }

   async init(context: Context["req"]) {
      if (this.isDashboardRequestBool) {
         return;
      }

      this.logger.sLog({}, 'LogTrackerService:Init: initialize log persistence', "bgCyanBright");

      const { trace } = context;
      const { clientIp, userAgent, origin, startTime, reqId, sourceUrl } = trace;

      this.logModel.insert({
         stage: 'initialised',
         requestId: reqId,
         requestDetails: {
            url: sourceUrl,
            initiatedTime: new Date(startTime),
         },
         clientDetails: {
            ip: clientIp,
            userAgent: userAgent,
            origin
         }
      });
   }

   async addUserId(requestId: string, userId: string) {
      if (this.isDashboardRequestBool) {
         return;
      }

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
      if (this.isDashboardRequestBool) {
         return;
      }

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
      if (this.isDashboardRequestBool) {
         return;
      }

      this.logger.sLog({ requestId }, 'LogTrackerService:Finalise: finalise log persistence', "bgCyanBright");

      this.logModel.findOneAndUpdate({ requestId }, {
         $set: data
      });
   }
}
