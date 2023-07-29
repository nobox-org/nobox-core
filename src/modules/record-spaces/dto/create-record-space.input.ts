import { Transform } from 'class-transformer';
import { RecordSpaceAuthOptions, RecordFieldStructure } from '../types';
import { RecordSpaceWebhooks } from '@/types';

export type CObject = { [x: string]: any };

export class CreateRecordSpaceInput {
   name: string;

   description?: string;

   webhooks?: RecordSpaceWebhooks;

   comments?: string;

   projectSlug: string;

   @Transform(value => value.toLowerCase())
   slug: string;

   recordFieldStructure: RecordFieldStructure[];

   authOptions?: RecordSpaceAuthOptions;

   clear?: boolean;

   mutate?: boolean;

   @Transform(value => JSON.parse(value))
   initialData?: Record<string, any>[];
}
