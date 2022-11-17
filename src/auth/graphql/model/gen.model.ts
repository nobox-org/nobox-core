import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AuthCheckResponse {
    @Field({ nullable: false })
    expired: boolean;
}