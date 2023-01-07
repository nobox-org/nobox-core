import { CustomLogger as Logger } from "@/logger/logger.service";
import { collection } from '@/utils/mongo';
import { MRecordField } from "./record-field.slim.schema";

const collectionName = "records";

export interface MRecordFieldContent {
  textContent: string;
  numberContent: string;
  field: string;
}

export interface MRecord {
  _id?: string;
  recordSpace: string;
  fieldsContent: MRecordFieldContent[];
  user: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type RecordsWithPopulatedFields = MRecord & {
  fieldsContent: (MRecordFieldContent & {
    field: MRecordField
  })[];
};

export const getRecordModel = (logger: Logger) => {
  const col = collection<MRecord>(collectionName, logger, {
    indexes: [{
      key: { recordSpace: 1, "fieldsContent.field": 1, "fieldsContent.textContent": 1 },
    }, {
      key: { recordSpace: 1, "fieldsContent.field": 1, "fieldsContent.numberContent": 1 },
    }]
  });
  return col;
}

