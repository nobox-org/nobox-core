import { RecordSpaceWebhooks } from '@/types';
import { RecordFieldStructure } from '../types';

export class CreateFieldsInput {
   recordSpaceSlug: string;

   projectSlug: string;

   recordFieldStructure: RecordFieldStructure[];

   recordSpaceDescription: string;

   recordSpaceWebhooks: RecordSpaceWebhooks;
}
