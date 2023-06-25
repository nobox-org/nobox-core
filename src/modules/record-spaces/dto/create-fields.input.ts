import { RecordStructure } from "../types";

export class CreateFieldsInput {
  recordSpaceSlug: string;

  projectSlug: string;

  recordStructure: RecordStructure[];
}
