import { CustomLogger as Logger } from '@/modules/logger/logger.service';
import { RecordFieldStructure } from '@/modules/record-spaces/types';
import * as fnvPlus from 'fnv-plus';

export const getRecordStructureHash = (
   recordStructure: RecordFieldStructure[],
   logger: Logger,
) => {
   logger.debug('getRecordStructureHash');
   const stringedValue = JSON.stringify(recordStructure);
   logger.sLog({ stringedValue }, 'getRecordStructureHash');
   const hash = fnvPlus.hash(JSON.stringify(recordStructure), 64);
   return hash.str();
};
