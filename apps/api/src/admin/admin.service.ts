import type {
  AdminCreateUserRequest,
  AdminUpdateUserRequest,
  UserRole,
} from "@box-winder/contracts";
import {
  generateInviteCode,
  generateToken,
  generateUserSecrets,
} from "@box-winder/core";
import {
  countActiveAdmins,
  findAdminUserByUuid,
  getSyncStatus,
  insertManagedUser,
  insertOutboxEvent,
  listAdminInvites,
  listAdminUsers,
  rotateAdminUserToken,
  rotateInviteCode,
  softDeleteAdminUser,
  updateAdminUser,
  withTransaction,
} from "@box-winder/db";
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { RequestUser } from "../auth/current-user.js";
// biome-ignore lint/style/useImportType: NestJS constructor injection needs runtime metadata.
import { DatabaseService } from "../db/database.service.js";

@Injectable()
export class AdminService {
  constructor(private readonly database: DatabaseService) {}

  listUsers() {
    return listAdminUsers(this.database.pool);
  }

  listInvites() {
    return listAdminInvites(this.database.pool);
  }

  syncStatus() {
    return getSyncStatus(this.database.pool);
  }

  async createUser(input: AdminCreateUserRequest) {
    requireValue("name", input.name);
    requireValue("email", input.email);
    requireValue("password", input.password);

    const role = input.role ?? "user";
    const enabled = input.enabled ?? true;
    const secrets = await generateUserSecrets(input.password);

    return withTransaction(this.database.pool, async (client) => {
      const user = await insertManagedUser(client, {
        name: input.name.trim(),
        email: input.email.trim(),
        passwordHash: secrets.passwordHash,
        token: secrets.token,
        tokenPrefix: secrets.tokenPrefix,
        role,
        enabled,
      });

      await insertOutboxEvent(client, {
        eventType: "user.registered",
        aggregateType: "user",
        aggregateUuid: user.uuid,
        payload: { userUuid: user.uuid },
      });

      return user;
    });
  }

  async updateUser(
    actor: RequestUser,
    uuid: string,
    input: AdminUpdateUserRequest,
  ) {
    return withTransaction(this.database.pool, async (client) => {
      const current = await findAdminUserByUuid(client, uuid);
      if (!current) {
        throw new NotFoundException("user not found");
      }

      await assertUserChangeAllowed(client, actor, current, input);

      const updated = await updateAdminUser(client, {
        uuid,
        name: input.name?.trim(),
        email: input.email?.trim(),
        role: input.role,
        enabled: input.enabled,
      });
      if (!updated) {
        throw new NotFoundException("user not found");
      }

      await insertOutboxEvent(client, {
        eventType:
          input.enabled !== undefined && input.enabled !== current.enabled
            ? "user.enabled_changed"
            : "user.updated",
        aggregateType: "user",
        aggregateUuid: updated.uuid,
        payload: { userUuid: updated.uuid },
      });

      return updated;
    });
  }

  async deleteUser(actor: RequestUser, uuid: string): Promise<boolean> {
    return withTransaction(this.database.pool, async (client) => {
      const current = await findAdminUserByUuid(client, uuid);
      if (!current) {
        throw new NotFoundException("user not found");
      }

      await assertUserChangeAllowed(client, actor, current, {
        enabled: false,
        role: "user",
      });

      const deleted = await softDeleteAdminUser(client, uuid);
      if (!deleted) {
        throw new NotFoundException("user not found");
      }

      await insertOutboxEvent(client, {
        eventType: "user.deleted",
        aggregateType: "user",
        aggregateUuid: uuid,
        payload: { userUuid: uuid },
      });

      return true;
    });
  }

  async rotateUserToken(uuid: string) {
    return withTransaction(this.database.pool, async (client) => {
      const current = await findAdminUserByUuid(client, uuid);
      if (!current) {
        throw new NotFoundException("user not found");
      }

      const generated = generateToken();
      const updated = await rotateAdminUserToken(client, {
        uuid,
        token: generated.token,
        tokenPrefix: generated.tokenPrefix,
      });
      if (!updated) {
        throw new NotFoundException("user not found");
      }

      await insertOutboxEvent(client, {
        eventType: "user.token_rotated",
        aggregateType: "user",
        aggregateUuid: uuid,
        payload: { userUuid: uuid },
      });

      return {
        uuid: updated.uuid,
        tokenPrefix: updated.tokenPrefix,
        tokenRotatedAt: updated.tokenRotatedAt,
      };
    });
  }

  async rotateInvite(userUuid: string) {
    return withTransaction(this.database.pool, async (client) => {
      const user = await findAdminUserByUuid(client, userUuid);
      if (!user) {
        throw new NotFoundException("user not found");
      }

      const invite = await rotateInviteCode(client, {
        userUuid,
        code: generateInviteCode().inviteCode,
      });
      if (!invite) {
        throw new NotFoundException("user not found");
      }

      await insertOutboxEvent(client, {
        eventType: "invite.rotated",
        aggregateType: "user",
        aggregateUuid: userUuid,
        payload: { userUuid },
      });

      return invite;
    });
  }

  async triggerSync(actor: RequestUser): Promise<boolean> {
    await insertOutboxEvent(this.database.pool, {
      eventType: "sync.requested",
      aggregateType: "sync",
      aggregateUuid: actor.uuid,
      payload: { requestedBy: actor.uuid },
    });

    return true;
  }
}

async function assertUserChangeAllowed(
  client: Parameters<typeof countActiveAdmins>[0],
  actor: RequestUser,
  target: {
    uuid: string;
    role: UserRole;
    enabled: boolean;
  },
  change: AdminUpdateUserRequest,
): Promise<void> {
  const removesAdminStatus =
    target.role === "admin" &&
    target.enabled &&
    (change.enabled === false || change.role === "user");

  if (actor.uuid === target.uuid && removesAdminStatus) {
    throw new ForbiddenException("cannot remove admin access from yourself");
  }

  if (removesAdminStatus && (await countActiveAdmins(client)) <= 1) {
    throw new ForbiddenException("cannot remove the last active admin");
  }
}

function requireValue(name: string, value: string): void {
  if (!value?.trim()) {
    throw new BadRequestException(`${name} cannot be empty`);
  }
}
