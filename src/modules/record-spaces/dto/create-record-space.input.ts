import { Transform } from 'class-transformer';
import { RecordSpaceAuthOptions, RecordStructure } from '../types';

export type CObject = { [x: string]: any };

export class CreateRecordSpaceInput {
  name: string;

  description?: string;

  comments?: string;

  projectSlug: string;

  @Transform((value) => value.toLowerCase())
  slug: string;

  recordStructure: RecordStructure[];

  authOptions?: RecordSpaceAuthOptions;

  clear?: boolean;

  mutate?: boolean;

  @Transform((value) => JSON.parse(value))
  initialData?: Record<string, any>[]
}
