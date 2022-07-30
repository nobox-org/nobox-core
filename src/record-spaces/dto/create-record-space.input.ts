import { IsValidAsAMongoObjectId } from '@/utils/custom-class-validators';
import { InputType, Field } from '@nestjs/graphql';
import { RecordStructure } from '../entities/record-structure.entity';

@InputType()
export class CreateRecordSpaceInput {
  @Field({ description: 'Name of Record Space' })
  name: string;

  @Field({ description: 'description of record space', nullable: true })
  description?: string;

  @Field({ description: 'Slug of Record Space' })
  slug: string;

  @Field(() => [RecordStructure], { description: 'Structure of record' })
  recordStructure: RecordStructure[];
}
