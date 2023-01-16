import { CustomLogger as Logger } from "@/logger/logger.service";
import { ObjectIdOrString } from "@/types";
import { collection } from '@/utils/mongo';
import { MBase } from "./base-model.slim.schema";

const collectionName = "test";

export interface MTest extends MBase {
  _id?: ObjectIdOrString;
  recordSpace: string;
  user: string;
}

export const getTestModel = (logger: Logger) => {
  const col = collection<MTest>(collectionName, logger);
  return col;
}

