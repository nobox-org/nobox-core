import { CustomLogger as Logger } from "@/logger/logger.service";
import { ObjectIdOrString } from "@/types";
import { collection } from '@/utils/mongo';
import { MRecordField } from "./record-field.slim.schema";


const collectionName = "recordspace";

export interface MRecordSpace {
  _id?: string;

  user: string;

  admins: string[];

  recordFields: ObjectIdOrString[];

  description?: string;

  name: string;

  slug: string;

  //defaults: true
  developerMode: boolean;

  project: string;

  recordStructureHash?: string;

  hydratedRecordFields: MRecordField[];
}

export const getRecordSpaceModel = (logger: Logger) => {
  const col = collection<MRecordSpace>(collectionName, logger, {
    indexes: [{
      key: { slug: 1, project: 1 },
      name: "slug1Project1",
    }]
  });
  return col;
}

