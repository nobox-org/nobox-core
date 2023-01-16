
import { InputType, Field } from '@nestjs/graphql';
import { Gender } from '../enums/gender.enum';

@InputType()
export class RegisterUserInput {
    @Field()
    firstName: string;

    @Field()
    lastName: string;

    @Field()
    email: string;

    @Field()
    password: string;

    @Field(() => Gender, { nullable: true })
    gender?: Gender;

    @Field()
    picture: string;
}
