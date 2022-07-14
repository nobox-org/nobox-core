import { InputType, Field } from "@nestjs/graphql";

@InputType()
export class SendNotificationsInput {
    @Field()
    message: string;

    @Field()
    title: string;
}
