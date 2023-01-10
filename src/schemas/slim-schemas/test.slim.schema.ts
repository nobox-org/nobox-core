import { CustomLogger as Logger } from "@/logger/logger.service";
import { ObjectIdOrString } from "@/types";
import { collection } from '@/utils/mongo';

const collectionName = "test";

export interface MTest {
  _id?: ObjectIdOrString;
  recordSpace: string;
  user: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export const getTestModel = (logger: Logger) => {
  const col = collection<MTest>(collectionName, logger);
  return col;
}

