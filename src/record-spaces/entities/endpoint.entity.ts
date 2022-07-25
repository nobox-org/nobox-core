import { Field, ObjectType } from '@nestjs/graphql';
import { HTTP_METHODS } from '../dto/https-methods.enum';

@ObjectType("Endpoint")
export class Endpoint {
  @Field()
  path: string

  @Field(() => HTTP_METHODS)
  method: HTTP_METHODS
}
