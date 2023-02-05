import { InputType, Field } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { RecordSpaceAuthOptions } from '../entities/record-space-auth-options.entity';
import { RecordStructure } from '../entities/record-structure.entity';

@InputType()
export class CreateRecordSpaceInput {
  @Field({ description: 'Name of Record Space' })
  name: string;

  @Field({ description: 'description of record space', nullable: true })
  description?: string;

  @Field({ description: 'Project Slug of Record Space' })
  projectSlug: string;

  @Transform((value) => value.toLowerCase())
  @Field({ description: 'Slug of Record Space' })
  slug: string;

  @Field(() => [RecordStructure], { description: 'Structure of record' })
  recordStructure: RecordStructure[];

  @Field({ description: 'Space Authentication Options', nullable: true })
  authOptions?: RecordSpaceAuthOptions;

  @Field({ description: 'Clears Record Space Data when it is true', nullable: true })
  clear?: boolean;
}
