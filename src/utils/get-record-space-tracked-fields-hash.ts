import { CustomLogger as Logger } from '@/modules/logger/logger.service';
import { TrackedRecordSpaceFields } from '@/modules/record-spaces/types';
import * as fnvPlus from 'fnv-plus';

export const getRecordSpaceTrackedFieldsHash = (
   trackedFields: TrackedRecordSpaceFields,
   logger: Logger,
) => {
   logger.sLog({ trackedFields }, 'getRecordSpaceTrackedFieldsHash');
   const stringedValue = JSON.stringify({
      name: trackedFields.name,
      description: trackedFields.description,
      webhooks: trackedFields.webhooks,
      recordFieldStructures: trackedFields.recordFieldStructures
   });
   logger.sLog({ stringedValue }, 'getRecordSpaceTrackedFieldsHash');
   const hash = fnvPlus.hash(stringedValue, 64);
   return hash.str();
};
