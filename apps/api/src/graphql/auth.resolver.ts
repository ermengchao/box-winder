import type { LoginRequest, RegisterRequest } from "@box-winder/contracts";
import { UseGuards } from "@nestjs/common";
import { Args, Context, Mutation, Query, Resolver } from "@nestjs/graphql";
// biome-ignore lint/style/useImportType: NestJS constructor injection needs runtime metadata.
import { AuthService } from "../auth/auth.service.js";
import type { RequestWithUser } from "../auth/current-user.js";
import { JwtSessionGuard } from "../auth/jwt-session.guard.js";
import {
  AuthPayload,
  CurrentUser,
  LoginInput,
  RegisterInput,
} from "./graphql.types.js";

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => AuthPayload)
  register(@Args("input", { type: () => RegisterInput }) input: RegisterInput) {
    return this.authService.register(input as RegisterRequest);
  }

  @Mutation(() => AuthPayload)
  login(@Args("input", { type: () => LoginInput }) input: LoginInput) {
    return this.authService.login(input as LoginRequest);
  }

  @Query(() => CurrentUser, { nullable: true })
  @UseGuards(JwtSessionGuard)
  me(@Context("req") request: RequestWithUser) {
    return this.authService.me(requiredUser(request));
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtSessionGuard)
  logout(@Context("req") request: RequestWithUser) {
    return this.authService.logout(requiredUser(request));
  }
}

function requiredUser(request: RequestWithUser) {
  if (!request.user) {
    throw new Error("expected authenticated request user");
  }

  return request.user;
}
