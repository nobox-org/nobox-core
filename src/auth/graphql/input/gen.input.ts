import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class AuthCheckInput {
    @Field()
    token: string;
}
