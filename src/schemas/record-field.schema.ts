import { CustomLogger as Logger } from "@/modules/logger/logger.service";
import { collection } from '@/utils/mongo';
import { MBase } from './base-model.schema';
import { RecordStructureType } from "@/types";

const collectionName = "record-fields";

export interface MRecordField extends MBase {
  recordSpace: string;

  description: string;

  comment: string;

  defaultValue?: string

  name: string;

  slug: string;

  type: RecordStructureType;

  required: boolean;

  unique: boolean;

  hashed: boolean;
}

export const getRecordFieldModel = (logger: Logger) => {
  const col = collection<MRecordField>(collectionName, logger);
  return col;
}

