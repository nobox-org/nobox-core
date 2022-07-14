import { Args, Query, Resolver } from "@nestjs/graphql";
import { AuthService } from "./auth.service";
import { LoginInput } from "./graphql/input/login.input";
import { AuthResponse } from "./graphql/model";

@Resolver(() => AuthResponse)
export class AuthResolver {
  constructor(
    private authService: AuthService,
  ) { }

  @Query(() => AuthResponse)
  async login(@Args('loginInput') loginInput: LoginInput) {
    return this.authService.login(loginInput);
  }
}