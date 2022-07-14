import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";
import { FileUpload, GraphQLUpload } from "graphql-upload-minimal";
import { GraphqlJwtAuthGuard } from "../guards/graphql-jwt-auth.guard";
import { RegisterUserInput, GetUserInput, UpdateUserInput } from "./graphql/input";
import { User } from "./graphql/model";
import { UserService } from "./user.service";


@Resolver(() => User)
export class UserResolver {
    constructor(
        private userService: UserService,
    ) { }

    @Mutation(() => User)
    async register(@Args('registerUserInput') registerUserInput: RegisterUserInput,) {
        return this.userService.register(registerUserInput);
    }

    @UseGuards(GraphqlJwtAuthGuard)
    @Mutation(() => User)
    async update(@Args('updateUserInput') updateUserInput: UpdateUserInput,) {
        return this.userService.update(updateUserInput);
    }

    @Query(() => User)
    async getUser(@Args('getUserInput') getUserInput: GetUserInput,) {
        return this.userService.getUser(getUserInput);
    }

    @Query(() => [User])
    async getUsers() {
        return this.userService.getUsers();
    }

    @Query(() => User)
    async getCurrentUser() {
        return this.userService.getCurrentUser();
    }

    @UseGuards(GraphqlJwtAuthGuard)
    @Mutation(() => User)
    async uploadProfileImage(@Args({ name: 'file', type: () => GraphQLUpload }) file: FileUpload): Promise<boolean> {
        return this.userService.updateUserPicture(file);
    }
}