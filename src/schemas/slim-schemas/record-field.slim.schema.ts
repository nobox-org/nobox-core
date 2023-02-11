import { RecordStructureType } from '@/record-spaces/dto/record-structure-type.enum';
import { CustomLogger as Logger } from "@/logger/logger.service";
import { collection } from '@/utils/mongo';
import { MBase } from './base-model.slim.schema';

const collectionName = "record-fields";

export interface MRecordField extends MBase {
  recordSpace: string;

  description: string;

  comment: string;

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

