import { RecordStructureType } from '@/record-spaces/dto/record-structure-type.enum';
import { CustomLogger as Logger } from "@/logger/logger.service";
import { collection } from '@/utils/mongo';
import { ObjectIdOrString } from '@/types';

const collectionName = "record-fields";

export interface MRecordField {
  _id?: ObjectIdOrString;

  recordSpace: string;

  description: string;

  name: string;

  slug: string;

  type: RecordStructureType;

  required: boolean;

  unique: boolean;

  hashed: boolean;

  createdAt?: Date;

  updatedAt?: Date;
}

export const getRecordFieldModel = (logger: Logger) => {
  const col = collection<MRecordField>(collectionName, logger);
  return col;
}

