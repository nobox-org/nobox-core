import { InputType, Field } from '@nestjs/graphql';


@InputType()
export class LoginInput {
    @Field()
    password: string;

    @Field()
    email: string;
}
