import { CustomLogger as Logger } from "@/logger/logger.service";
import { collection } from '@/utils/mongo';
import { MBase } from "./base-model.slim.schema";
import { MRecord } from "./record.slim.schema";

const collectionName = "record-dump";

export interface MRecordDump extends MBase {
  record: MRecord;
  [x: string]: any;
}

export const getRecordDumpModel = (logger: Logger) => {
  const col = collection<MRecordDump>(collectionName, logger);
  return col;
}

