import type { LoginRequest, RegisterRequest } from "@box-winder/contracts";
import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
// biome-ignore lint/style/useImportType: NestJS constructor injection needs runtime metadata.
import { AuthService } from "./auth.service.js";
import type { RequestWithUser } from "./current-user.js";
import { JwtSessionGuard } from "./jwt-session.guard.js";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  register(@Body() input: RegisterRequest) {
    return this.authService.register(input);
  }

  @Post("login")
  login(@Body() input: LoginRequest) {
    return this.authService.login(input);
  }

  @Post("logout")
  @UseGuards(JwtSessionGuard)
  logout(@Req() request: RequestWithUser) {
    return this.authService.logout(requiredUser(request));
  }

  @Get("me")
  @UseGuards(JwtSessionGuard)
  me(@Req() request: RequestWithUser) {
    return this.authService.me(requiredUser(request));
  }
}

function requiredUser(request: RequestWithUser) {
  if (!request.user) {
    throw new Error("expected authenticated request user");
  }

  return request.user;
}
