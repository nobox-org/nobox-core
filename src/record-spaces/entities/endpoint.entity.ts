import { Field, ObjectType } from '@nestjs/graphql';
import { HTTP_METHODS } from '../dto/https-methods.enum';
import { RecordStructure } from './record-structure.entity';

@ObjectType("Endpoint")
export class Endpoint {
  @Field()
  path: string

  @Field(() => HTTP_METHODS)
  method: HTTP_METHODS

  @Field(() => [RecordStructure], { nullable: true })
  params?: RecordStructure[]

  @Field(() => [RecordStructure], { nullable: true })
  body?: RecordStructure[]

  @Field()
  example: string
}
