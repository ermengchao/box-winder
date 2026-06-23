import type { AuthSessionClaims } from "@box-winder/contracts";
import { findActiveSessionUser } from "@box-winder/db";
import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
// biome-ignore lint/style/useImportType: NestJS constructor injection needs runtime metadata.
import { JwtService } from "@nestjs/jwt";
// biome-ignore lint/style/useImportType: NestJS constructor injection needs runtime metadata.
import { DatabaseService } from "../db/database.service.js";
import type { RequestWithUser } from "./current-user.js";

@Injectable()
export class JwtSessionGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly database: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = getRequest(context);
    const token = extractBearerToken(request);
    if (!token) {
      throw new UnauthorizedException("missing bearer token");
    }

    let claims: AuthSessionClaims;
    try {
      claims = await this.jwtService.verifyAsync<AuthSessionClaims>(token);
    } catch {
      throw new UnauthorizedException("invalid bearer token");
    }

    const user = await findActiveSessionUser(this.database.pool, {
      userUuid: claims.sub,
      sessionUuid: claims.sid,
    });
    if (!user) {
      throw new UnauthorizedException("session is no longer active");
    }

    request.user = user;
    return true;
  }
}

export function getRequest(context: ExecutionContext): RequestWithUser {
  if (context.getType<string>() === "graphql") {
    return GqlExecutionContext.create(context).getContext<{
      req: RequestWithUser;
    }>().req;
  }

  return context.switchToHttp().getRequest<RequestWithUser>();
}

function extractBearerToken(request: RequestWithUser): string | null {
  const authorization = request.headers?.authorization;
  const value = Array.isArray(authorization) ? authorization[0] : authorization;
  const match = value?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}
