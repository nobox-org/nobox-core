import { RecordFieldContentInput } from '../types';

export class CreateRecordInput {
   recordSpaceSlug: string;

   projectSlug: string;

   fieldsContent: RecordFieldContentInput[];
}
