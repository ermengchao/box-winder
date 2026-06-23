import { loadApiConfig } from "@box-winder/config";
import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthResolver } from "../graphql/auth.resolver.js";
import { AdminGuard } from "./admin.guard.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { JwtStrategy } from "./jwt.strategy.js";
import { JwtSessionGuard } from "./jwt-session.guard.js";

const config = loadApiConfig();

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: config.jwtSecret,
      signOptions: {
        expiresIn: config.jwtExpiresIn,
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthResolver,
    JwtStrategy,
    JwtSessionGuard,
    AdminGuard,
  ],
  exports: [AuthService, JwtModule, JwtSessionGuard, AdminGuard],
})
export class AuthModule {}
