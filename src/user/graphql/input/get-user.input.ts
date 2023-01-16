
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class GetUserInput {
    @Field()
    _id?: string;

    @Field()
    email?: string;
}
