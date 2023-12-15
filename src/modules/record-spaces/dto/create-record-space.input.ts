import { Transform } from 'class-transformer';
import { RecordSpaceAuthOptions, RecordFieldStructure } from '../types';
import { RecordSpaceWebhooks } from 'nobox-shared-lib';

export type CObject = { [x: string]: any };

export class CreateRecordSpaceInput {
   name: string;

   description?: string;

   comments?: string;

   projectSlug: string;

   @Transform(({ value }) => value.toLowerCase())
   slug: string;

   recordFieldStructures: RecordFieldStructure[];

   authOptions?: RecordSpaceAuthOptions;

   clear?: boolean;

   mutate?: boolean;

   @Transform(({ value }) => JSON.parse(value))
   initialData?: Record<string, any>[];

   webhooks?: RecordSpaceWebhooks;
}
