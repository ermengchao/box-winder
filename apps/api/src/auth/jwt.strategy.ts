import { loadApiConfig } from "@box-winder/config";
import type { AuthSessionClaims } from "@box-winder/contracts";
import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const config = loadApiConfig();

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.jwtSecret,
    });
  }

  validate(payload: AuthSessionClaims) {
    return payload;
  }
}
