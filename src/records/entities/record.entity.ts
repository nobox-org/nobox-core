import { ObjectType, Field } from '@nestjs/graphql';
import { RecordFieldContentOutput } from './record-field-content.output.entity';

@ObjectType()
export class Record {

  @Field({ description: 'Record ID' })
  id: string;

  @Field({ description: 'RecordSpace for Records ' })
  recordSpace: string;

  @Field(() => [RecordFieldContentOutput], { description: 'Record Field Content ' })
  fieldsContent: RecordFieldContentOutput[];

  @Field({ description: 'User that created Record' })
  user: string;

  @Field(() => Date, { description: 'Date Record was created' })
  createdAt: Date;

  @Field(() => Date, { description: 'Date Record was updated' })
  updatedAt: Date;
}
