
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class GetUserInput {
    @Field()
    id: string;
}
