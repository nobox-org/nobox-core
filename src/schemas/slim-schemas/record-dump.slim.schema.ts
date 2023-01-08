import { CustomLogger as Logger } from "@/logger/logger.service";
import { ObjectIdOrString } from "@/types";
import { collection } from '@/utils/mongo';
import { MRecord } from "./record.slim.schema";

const collectionName = "record-dump";

export interface MRecordDump {
  _id?: ObjectIdOrString;
  record: MRecord;
  createdAt?: Date;
  updatedAt?: Date;
  [x: string]: any;
}

export const getRecordDumpModel = (logger: Logger) => {
  const col = collection<MRecordDump>(collectionName, logger);
  return col;
}

