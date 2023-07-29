import { CustomLogger as Logger } from '@/modules/logger/logger.service';
import { CreateRecordSpaceInput } from '@/modules/record-spaces/dto/create-record-space.input';
import * as fnvPlus from 'fnv-plus';

export type GetRecordStructureHashInput = Pick<CreateRecordSpaceInput, 'webhooks' | 'description' | 'recordFieldStructure'>;

export const getRecordStructureHash = (args: {
   recordStructure: GetRecordStructureHashInput;
   logger: Logger;
}) => {
   const { recordStructure, logger } = args;
   logger.sLog({ recordStructure }, 'getRecordStructureHash');
   const { webhooks, description, recordFieldStructure } = recordStructure;
   const stringedValue = JSON.stringify({ webhooks, description, recordFieldStructure });
   logger.sLog({ stringedValue }, 'getRecordStructureHash');
   const hash = fnvPlus.hash(stringedValue, 64);
   return hash.str();
};
