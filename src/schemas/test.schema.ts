import { CustomLogger as Logger } from "@/logger/logger.service";
import { collection } from '@/utils/mongo';
import { MBase } from "./base-model.schema";

/**
 * This is a test schema for testing purposes.
 */

const collectionName = "test";

export interface MTest extends MBase {
  recordSpace: string;
  user: string;
}

export const getTestModel = (logger: Logger) => {
  const col = collection<MTest>(collectionName, logger);
  return col;
}

