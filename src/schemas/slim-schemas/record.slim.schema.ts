import { CustomLogger as Logger } from "@/logger/logger.service";
import { ObjectIdOrString } from "@/types";
import { collection } from '@/utils/mongo';
import { MBase } from "./base-model.slim.schema";

const collectionName = "records";

export interface MRecordFieldContent {
  textContent: string;
  numberContent: string;
  booleanContent: string;
  field: string;
}

export interface MRecord extends MBase {
  recordSpace: string;
  fieldsContent: MRecordFieldContent[];
  user: string;
  createdAt: Date;
  updatedAt: Date;
}

export const getRecordModel = (logger: Logger) => {
  const col = collection<MRecord>(collectionName, logger);
  return col;
}

