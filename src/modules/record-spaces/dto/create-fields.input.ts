import { RecordFieldStructure } from '../types';

export class CreateFieldsInput {
   recordSpaceSlug: string;

   projectSlug: string;

   recordFieldStructures: RecordFieldStructure[];
}
