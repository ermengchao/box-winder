import type { UserRole } from "@box-winder/contracts";
import type { DbClient } from "./postgres.js";

export type DbUser = {
  uuid: string;
  email: string;
  name: string;
  passwordHash: string;
  role: UserRole;
  token: string;
  tokenPrefix: string;
};

export type InsertUserInput = {
  name: string;
  email: string;
  passwordHash: string;
  token: string;
  tokenPrefix: string;
  invitedByUuid?: string | null;
};

export type SingBoxUserRow = {
  uuid: string;
  name: string;
  token: string;
};

export async function findInviteOwnerByCode(
  client: DbClient,
  code: string,
): Promise<string | null> {
  const result = await client.query<{ user_uuid: string }>(
    `
    SELECT user_uuid
    FROM user_invites
    WHERE code = $1
    `,
    [code],
  );

  return result.rows[0]?.user_uuid ?? null;
}

export async function insertUser(
  client: DbClient,
  input: InsertUserInput,
): Promise<DbUser> {
  const result = await client.query<DbUserRow>(
    `
    INSERT INTO users (
      name,
      email,
      password_hash,
      token,
      token_prefix,
      invited_by_uuid
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING uuid, email, name, password_hash, role, token, token_prefix
    `,
    [
      input.name,
      input.email,
      input.passwordHash,
      input.token,
      input.tokenPrefix,
      input.invitedByUuid ?? null,
    ],
  );

  return mapUser(result.rows[0]);
}

export async function findEnabledUserByEmail(
  client: DbClient,
  email: string,
): Promise<DbUser | null> {
  const result = await client.query<DbUserRow>(
    `
    SELECT uuid, email, name, password_hash, role, token, token_prefix
    FROM users
    WHERE email = $1
      AND enabled = TRUE
      AND deleted_at IS NULL
    `,
    [email],
  );

  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

export async function findEnabledUserByToken(
  client: DbClient,
  token: string,
): Promise<DbUser | null> {
  const result = await client.query<DbUserRow>(
    `
    SELECT uuid, email, name, password_hash, role, token, token_prefix
    FROM users
    WHERE token = $1
      AND enabled = TRUE
      AND deleted_at IS NULL
    `,
    [token],
  );

  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

export async function insertSession(
  client: DbClient,
  input: {
    userUuid: string;
    expiresAt: Date;
    jwtId?: string;
    userAgent?: string;
    ipAddress?: string;
  },
): Promise<string> {
  const result = await client.query<{ uuid: string }>(
    `
    INSERT INTO sessions (
      user_uuid,
      expires_at,
      jwt_id,
      user_agent,
      ip_address
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING uuid
    `,
    [
      input.userUuid,
      input.expiresAt,
      input.jwtId ?? null,
      input.userAgent ?? null,
      input.ipAddress ?? null,
    ],
  );

  return result.rows[0]?.uuid ?? "";
}

export async function insertOutboxEvent(
  client: DbClient,
  input: {
    eventType: string;
    aggregateType: string;
    aggregateUuid?: string;
    payload?: Record<string, unknown>;
  },
): Promise<string> {
  const result = await client.query<{ uuid: string }>(
    `
    INSERT INTO outbox_events (
      event_type,
      aggregate_type,
      aggregate_uuid,
      payload
    )
    VALUES ($1, $2, $3, $4)
    RETURNING uuid
    `,
    [
      input.eventType,
      input.aggregateType,
      input.aggregateUuid ?? null,
      input.payload ?? {},
    ],
  );

  return result.rows[0]?.uuid ?? "";
}

export async function listEnabledUsersForSingBox(
  client: DbClient,
): Promise<SingBoxUserRow[]> {
  const result = await client.query<SingBoxUserRow>(
    `
    SELECT uuid, name, token
    FROM users
    WHERE enabled = TRUE
      AND deleted_at IS NULL
    ORDER BY created_at ASC, uuid ASC
    `,
  );

  return result.rows;
}

type DbUserRow = {
  uuid: string;
  email: string;
  name: string;
  password_hash: string;
  role: UserRole;
  token: string;
  token_prefix: string;
};

function mapUser(row: DbUserRow | undefined): DbUser {
  if (!row) {
    throw new Error("expected user row");
  }

  return {
    uuid: row.uuid,
    email: row.email,
    name: row.name,
    passwordHash: row.password_hash,
    role: row.role,
    token: row.token,
    tokenPrefix: row.token_prefix,
  };
}
