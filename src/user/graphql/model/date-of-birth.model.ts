import { Field, InputType, ObjectType } from '@nestjs/graphql';

@ObjectType("DateOfBirth")
@InputType("DateOfBirthInput")
export class DateOfBirth {
    @Field()
    year: string;

    @Field()
    month: string;

    @Field()
    day: string;
}