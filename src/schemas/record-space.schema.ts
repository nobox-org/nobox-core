import { CustomLogger as Logger } from "@/logger/logger.service";
import { ObjectIdOrString, RecordSpaceType } from "@/types";
import { collection } from '@/utils/mongo';
import { MBase } from "./base-model.schema";
import { MProject } from "./projects.schema";
import { MRecordField } from "./record-field.schema";


const collectionName = "recordspace";

export interface MRecordSpace extends MBase {
  user: string;

  admins: string[];

  recordFields: ObjectIdOrString[];

  description?: string;

  name: string;

  slug: string;

  developerMode: boolean;

  project: string;

  projectSlug: string;

  hydratedProject: MProject;

  recordStructureHash?: string;

  hydratedRecordFields: MRecordField[];

  hasHashedFields: boolean;

  searchableFields?: string[];

  initialDataExist?: boolean;

  type: RecordSpaceType;
}

export const getRecordSpaceModel = (logger: Logger) => {
  const col = collection<MRecordSpace>(collectionName, logger, {
    indexes: [{
      key: { slug: 1, projectSlug: 1, user: 1 },
      name: "slug1-projectSlug1-user1",
    }]
  });
  return col;
}

