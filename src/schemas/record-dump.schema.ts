import { CustomLogger as Logger } from '@/modules/logger/logger.service';
import { collection } from '@/utils/mongo';
import { MBase } from './base-model.schema';
import { MRecord } from './record.schema';

const collectionName = 'record-dump';

export interface MRecordDump extends MBase {
   record: MRecord;
   recordId: string;
   [x: string]: any;
}

export const getRecordDumpModel = (logger: Logger) => {
   const col = collection<MRecordDump>(collectionName, logger);
   return col;
};
