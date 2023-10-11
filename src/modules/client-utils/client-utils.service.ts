import {
   Inject,
   Injectable,
   Scope,
} from '@nestjs/common';
import { RecordSpacesService } from '@/modules/record-spaces/record-spaces.service';
import { CustomLogger as Logger } from '@/modules/logger/logger.service';


import {
   Context,
} from '@/types';
import { REQUEST } from '@nestjs/core';
import {
   contextGetter,
} from '@/utils';
import { getStructureFromObject } from '@/utils/gen';
import { throwBadRequest } from '@/utils/exceptions';

@Injectable({ scope: Scope.REQUEST })
export class ClientUtilsService {
   private contextFactory: ReturnType<typeof contextGetter>;

   constructor(
      @Inject(REQUEST) private context: Context,
      private recordSpacesService: RecordSpacesService,
      private logger: Logger,
   ) {
      this.contextFactory = contextGetter(this.context.req, this.logger);
   }

   async setInferredStructure(
      args: {
         params: { recordSpaceSlug: string; projectSlug: string };
         body: Record<string, string>;
      }
   ) {
      this.logger.sLog({ args }, 'ClientUtilsService::setInferredStructure');

      const {
         params: { recordSpaceSlug, projectSlug },
         body,
      } = args;

      const structure = getStructureFromObject({
         recordSpaceSlug,
         body,
         projectSlug
      });

      const {
         user,
      } = this.contextFactory.getFullContext();


      const userId = String(user._id);


      const recordSpace = await this.recordSpacesService.findOne({
         query: {
            projectSlug,
            slug: recordSpaceSlug
         }
      });

      await this.recordSpacesService.handleRecordSpaceMutationInPreOperation({
         recordSpaceSlug,
         recordFieldStructures: structure.recordFieldStructures,
         projectSlug,
         userId,
         autoCreateRecordSpace: true,
         autoCreateProject: true,
         incomingRecordSpaceStructure: structure,
         allowMutation: true,
         usePreStoredStructure: false,
         recordSpaceDetails: recordSpace
      });

      return structure;
   }

   async getInferredStructure(
      args: {
         params: { recordSpaceSlug: string; projectSlug: string };
         body: Record<string, string>;
      }
   ) {
      this.logger.sLog({ args }, 'ClientUtilsService::setInferredStructure');

      const {
         params: { recordSpaceSlug, projectSlug },
         body,
      } = args;

      const structure = getStructureFromObject({
         recordSpaceSlug,
         body,
         projectSlug
      });

      return structure;
   }


   async setStructure(
      args: {
         params: { recordSpaceSlug: string; projectSlug: string };
         body: any;
      }
   ) {
      this.logger.sLog({ args }, 'ClientUtilsService::setStructure');

      const {
         params: { recordSpaceSlug, projectSlug },
         body: structure
      } = args;

      const {
         user,
         headers
      } = this.contextFactory.getFullContext();

      const userId = String(user._id);

      if (headers?.["use-pre-stored-structure"] === "true") {
         throwBadRequest("use-pre-stored-structure header should not be set when directly seting structure")
      }

      const recordSpace = await this.recordSpacesService.findOne({
         query: {
            projectSlug,
            slug: recordSpaceSlug
         }
      })

      const res = await this.recordSpacesService.handleRecordSpaceMutationInPreOperation({
         recordSpaceSlug,
         recordFieldStructures: structure.recordFieldStructures,
         projectSlug,
         userId,
         autoCreateRecordSpace: true,
         autoCreateProject: false,
         incomingRecordSpaceStructure: structure,
         allowMutation: true,
         usePreStoredStructure: false,
         recordSpaceDetails: recordSpace
      });

      return {
         res,
         structure
      };
   }

}
