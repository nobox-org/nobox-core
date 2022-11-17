import { Args, Query, Resolver } from "@nestjs/graphql";
import { AuthService } from "./auth.service";
import { AuthCheckInput } from "./graphql/input/gen.input";
import { LoginInput } from "./graphql/input/login.input";
import { AuthResponse } from "./graphql/model";
import { AuthCheckResponse } from "./graphql/model/gen.model";

@Resolver(() => AuthResponse)
export class AuthResolver {
  constructor(
    private authService: AuthService,
  ) { }

  @Query(() => AuthResponse)
  async login(@Args('loginInput') loginInput: LoginInput): Promise<AuthResponse> {
    return this.authService.login(loginInput);
  }

  @Query(() => AuthCheckResponse)
  authCheck(@Args('authCheckInput') authCheck: AuthCheckInput): AuthCheckResponse {
    return this.authService.authCheck(authCheck);
  }
}