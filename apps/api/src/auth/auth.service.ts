import { expiresInToDate, loadApiConfig } from "@box-winder/config";
import type {
  AuthResponse,
  CurrentUserResponse,
  LegacyLoginPayload,
  LegacyRegisterPayload,
  LoginRequest,
  RegisterRequest,
} from "@box-winder/contracts";
import { generateUserSecrets, verifyPassword } from "@box-winder/core";
import {
  type DbUser,
  findEnabledUserByEmail,
  findInviteOwnerByCode,
  insertOutboxEvent,
  insertSession,
  insertUser,
  revokeSession,
  withTransaction,
} from "@box-winder/db";
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
// biome-ignore lint/style/useImportType: NestJS constructor injection needs runtime metadata.
import { JwtService } from "@nestjs/jwt";
// biome-ignore lint/style/useImportType: NestJS constructor injection needs runtime metadata.
import { DatabaseService } from "../db/database.service.js";
import type { RequestUser } from "./current-user.js";

type AuthResult = {
  user: DbUser;
  accessToken: string;
  sessionUuid: string;
};

@Injectable()
export class AuthService {
  private readonly config = loadApiConfig();

  constructor(
    private readonly jwtService: JwtService,
    private readonly database: DatabaseService,
  ) {}

  async register(input: RegisterRequest): Promise<AuthResponse> {
    const result = await this.registerInternal(input);
    return this.toAuthResponse(result);
  }

  async login(input: LoginRequest): Promise<AuthResponse> {
    const result = await this.loginInternal(input);
    return this.toAuthResponse(result);
  }

  async legacyRegister(input: RegisterRequest): Promise<LegacyRegisterPayload> {
    const result = await this.registerInternal(input);

    return {
      uuid: result.user.uuid,
      token: result.user.token,
      tokenPrefix: result.user.tokenPrefix,
    };
  }

  async legacyLogin(input: LoginRequest): Promise<LegacyLoginPayload> {
    const result = await this.loginInternal(input);

    return {
      uuid: result.user.uuid,
      name: result.user.name,
      email: result.user.email,
      token: result.user.token,
      tokenPrefix: result.user.tokenPrefix,
    };
  }

  async me(user: RequestUser): Promise<CurrentUserResponse> {
    return {
      uuid: user.uuid,
      email: user.email,
      name: user.name,
      role: user.role,
      sessionUuid: user.sessionUuid,
    };
  }

  async logout(user: RequestUser): Promise<boolean> {
    await revokeSession(this.database.pool, {
      userUuid: user.uuid,
      sessionUuid: user.sessionUuid,
    });

    return true;
  }

  private async registerInternal(input: RegisterRequest): Promise<AuthResult> {
    requireValue("name", input.name);
    requireValue("email", input.email);
    requireValue("password", input.password);
    requireValue("inviteCode", input.inviteCode);

    const secrets = await generateUserSecrets(input.password);
    const expiresAt = expiresInToDate(this.config.jwtExpiresIn);

    return withTransaction(this.database.pool, async (client) => {
      const inviterUuid = await findInviteOwnerByCode(
        client,
        input.inviteCode.trim(),
      );
      if (!inviterUuid) {
        throw new BadRequestException("invalid invite code");
      }

      const user = await insertUser(client, {
        name: input.name,
        email: input.email,
        passwordHash: secrets.passwordHash,
        token: secrets.token,
        tokenPrefix: secrets.tokenPrefix,
        invitedByUuid: inviterUuid,
      });
      const sessionUuid = await insertSession(client, {
        userUuid: user.uuid,
        expiresAt,
      });
      const accessToken = await this.signAccessToken(user, sessionUuid);

      await insertOutboxEvent(client, {
        eventType: "user.registered",
        aggregateType: "user",
        aggregateUuid: user.uuid,
        payload: {
          userUuid: user.uuid,
        },
      });

      return {
        user,
        accessToken,
        sessionUuid,
      };
    });
  }

  private async loginInternal(input: LoginRequest): Promise<AuthResult> {
    requireValue("email", input.email);
    requireValue("password", input.password);

    const user = await findEnabledUserByEmail(this.database.pool, input.email);
    if (!user) {
      throw new UnauthorizedException("invalid email or password");
    }

    const passwordMatches = await verifyPassword(
      input.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException("invalid email or password");
    }

    const expiresAt = expiresInToDate(this.config.jwtExpiresIn);
    const sessionUuid = await insertSession(this.database.pool, {
      userUuid: user.uuid,
      expiresAt,
    });
    const accessToken = await this.signAccessToken(user, sessionUuid);

    return {
      user,
      accessToken,
      sessionUuid,
    };
  }

  private async signAccessToken(
    user: DbUser,
    sessionUuid: string,
  ): Promise<string> {
    return this.jwtService.signAsync({
      sub: user.uuid,
      role: user.role,
      sid: sessionUuid,
    });
  }

  private toAuthResponse(result: AuthResult): AuthResponse {
    return {
      user: {
        uuid: result.user.uuid,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        tokenPrefix: result.user.tokenPrefix,
      },
      accessToken: result.accessToken,
      expiresIn: this.config.jwtExpiresIn,
    };
  }
}

function requireValue(name: string, value: string): void {
  if (!value) {
    throw new BadRequestException(`${name} cannot be empty`);
  }
}
