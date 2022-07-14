import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Resolver } from "@nestjs/graphql";
import { GraphqlJwtAuthGuard } from "../guards/graphql-jwt-auth.guard";
import { SendNotificationsInput } from "./graphql/input";
import { MailService } from "./mail.service";

@UseGuards(GraphqlJwtAuthGuard)
@Resolver(() => Boolean)
export class MailResolver {
    constructor(
        private mailService: MailService,
    ) { }

    @Mutation(() => Boolean)
    async sendNotificationsToAllUsers(@Args('sendNotificationsInput') sendNotificationsInput: SendNotificationsInput,) {
        return this.mailService.sendPushNotifications({ sendToAllUsers: true, message: { notification: { body: sendNotificationsInput.message, title: sendNotificationsInput.title } } });
    }

}