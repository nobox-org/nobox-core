
import { InputType, Field } from '@nestjs/graphql';
import { Interests } from '../enums';
import { UserRoles } from '../enums/user-roles.enum';
import { Address } from '../model';

@InputType()
export class UpdateUserInput {
    @Field({ description: "Object Id of User"})
    id: string;

    @Field(() => Address, { nullable: true})
    address?: Address;

    @Field({ nullable: true})
    industry?: string;

    @Field({ nullable: true})
    organization?: string;

    @Field(() => [Interests], { nullable: true})
    interests?: Interests[];

    @Field(() => UserRoles, { nullable: true})
    role?: UserRoles;

    @Field({ nullable: true})
    password?: string;

    @Field({ nullable: true})
    FCMToken?: string;
}
