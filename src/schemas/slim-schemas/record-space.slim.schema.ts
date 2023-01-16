import { CustomLogger as Logger } from "@/logger/logger.service";
import { ObjectIdOrString } from "@/types";
import { collection } from '@/utils/mongo';
import { MBase } from "./base-model.slim.schema";
import { MProject } from "./projects.slim.schema";
import { MRecordField } from "./record-field.slim.schema";


const collectionName = "recordspace";

export interface MRecordSpace extends MBase {
  user: string;

  admins: string[];

  recordFields: ObjectIdOrString[];

  description?: string;

  name: string;

  slug: string;

  //defaults: true
  developerMode: boolean;

  project: string;

  projectSlug: string;

  hydratedProject: MProject;

  recordStructureHash?: string;

  hydratedRecordFields: MRecordField[];

  hasHashedFields: boolean;
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

