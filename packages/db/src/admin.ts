import type { UserRole } from "@box-winder/contracts";
import type { DbClient } from "./postgres.js";

export type ActiveSessionUser = {
  uuid: string;
  email: string;
  name: string;
  role: UserRole;
  sessionUuid: string;
};

export type AdminUserRow = {
  uuid: string;
  email: string;
  name: string;
  role: UserRole;
  enabled: boolean;
  tokenPrefix: string;
  createdAt: Date;
  updatedAt: Date;
  tokenRotatedAt: Date;
};

export type AdminInviteRow = {
  userUuid: string;
  email: string;
  name: string;
  code: string | null;
  createdAt: Date | null;
  rotatedAt: Date | null;
};

export async function findActiveSessionUser(
  client: DbClient,
  input: {
    userUuid: string;
    sessionUuid: string;
  },
): Promise<ActiveSessionUser | null> {
  const result = await client.query<{
    uuid: string;
    email: string;
    name: string;
    role: UserRole;
    session_uuid: string;
  }>(
    `
    SELECT
      users.uuid,
      users.email,
      users.name,
      users.role,
      sessions.uuid AS session_uuid
    FROM sessions
    INNER JOIN users ON users.uuid = sessions.user_uuid
    WHERE sessions.uuid = $1
      AND users.uuid = $2
      AND sessions.revoked_at IS NULL
      AND sessions.expires_at > now()
      AND users.enabled = TRUE
      AND users.deleted_at IS NULL
    `,
    [input.sessionUuid, input.userUuid],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  await client.query(
    `
    UPDATE sessions
    SET last_seen_at = now()
    WHERE uuid = $1
    `,
    [input.sessionUuid],
  );

  return {
    uuid: row.uuid,
    email: row.email,
    name: row.name,
    role: row.role,
    sessionUuid: row.session_uuid,
  };
}

export async function revokeSession(
  client: DbClient,
  input: {
    userUuid: string;
    sessionUuid: string;
  },
): Promise<void> {
  await client.query(
    `
    UPDATE sessions
    SET revoked_at = now()
    WHERE uuid = $1
      AND user_uuid = $2
      AND revoked_at IS NULL
    `,
    [input.sessionUuid, input.userUuid],
  );
}

export async function listAdminUsers(
  client: DbClient,
): Promise<AdminUserRow[]> {
  const result = await client.query<AdminUserDbRow>(
    `
    SELECT
      uuid,
      email,
      name,
      role,
      enabled,
      token_prefix,
      created_at,
      updated_at,
      token_rotated_at
    FROM users
    WHERE deleted_at IS NULL
    ORDER BY created_at ASC, uuid ASC
    `,
  );

  return result.rows.map(mapAdminUser);
}

export async function findAdminUserByUuid(
  client: DbClient,
  uuid: string,
): Promise<AdminUserRow | null> {
  const result = await client.query<AdminUserDbRow>(
    `
    SELECT
      uuid,
      email,
      name,
      role,
      enabled,
      token_prefix,
      created_at,
      updated_at,
      token_rotated_at
    FROM users
    WHERE uuid = $1
      AND deleted_at IS NULL
    `,
    [uuid],
  );

  return result.rows[0] ? mapAdminUser(result.rows[0]) : null;
}

export async function insertManagedUser(
  client: DbClient,
  input: {
    name: string;
    email: string;
    passwordHash: string;
    token: string;
    tokenPrefix: string;
    role: UserRole;
    enabled: boolean;
  },
): Promise<AdminUserRow> {
  const result = await client.query<AdminUserDbRow>(
    `
    INSERT INTO users (
      name,
      email,
      password_hash,
      token,
      token_prefix,
      role,
      enabled
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING
      uuid,
      email,
      name,
      role,
      enabled,
      token_prefix,
      created_at,
      updated_at,
      token_rotated_at
    `,
    [
      input.name,
      input.email,
      input.passwordHash,
      input.token,
      input.tokenPrefix,
      input.role,
      input.enabled,
    ],
  );

  return mapAdminUser(result.rows[0]);
}

export async function updateAdminUser(
  client: DbClient,
  input: {
    uuid: string;
    name?: string;
    email?: string;
    role?: UserRole;
    enabled?: boolean;
  },
): Promise<AdminUserRow | null> {
  const result = await client.query<AdminUserDbRow>(
    `
    UPDATE users
    SET
      name = COALESCE($2, name),
      email = COALESCE($3, email),
      role = COALESCE($4::user_role, role),
      enabled = COALESCE($5, enabled),
      updated_at = now()
    WHERE uuid = $1
      AND deleted_at IS NULL
    RETURNING
      uuid,
      email,
      name,
      role,
      enabled,
      token_prefix,
      created_at,
      updated_at,
      token_rotated_at
    `,
    [
      input.uuid,
      input.name ?? null,
      input.email ?? null,
      input.role ?? null,
      input.enabled ?? null,
    ],
  );

  return result.rows[0] ? mapAdminUser(result.rows[0]) : null;
}

export async function softDeleteAdminUser(
  client: DbClient,
  uuid: string,
): Promise<boolean> {
  const result = await client.query(
    `
    UPDATE users
    SET deleted_at = now(),
        updated_at = now()
    WHERE uuid = $1
      AND deleted_at IS NULL
    `,
    [uuid],
  );

  return (result.rowCount ?? 0) > 0;
}

export async function rotateAdminUserToken(
  client: DbClient,
  input: {
    uuid: string;
    token: string;
    tokenPrefix: string;
  },
): Promise<AdminUserRow | null> {
  const result = await client.query<AdminUserDbRow>(
    `
    UPDATE users
    SET token = $2,
        token_prefix = $3,
        token_rotated_at = now(),
        updated_at = now()
    WHERE uuid = $1
      AND deleted_at IS NULL
    RETURNING
      uuid,
      email,
      name,
      role,
      enabled,
      token_prefix,
      created_at,
      updated_at,
      token_rotated_at
    `,
    [input.uuid, input.token, input.tokenPrefix],
  );

  return result.rows[0] ? mapAdminUser(result.rows[0]) : null;
}

export async function countActiveAdmins(client: DbClient): Promise<number> {
  const result = await client.query<{ count: string }>(
    `
    SELECT count(*)::text AS count
    FROM users
    WHERE role = 'admin'
      AND enabled = TRUE
      AND deleted_at IS NULL
    `,
  );

  return Number.parseInt(result.rows[0]?.count ?? "0", 10);
}

export async function listAdminInvites(
  client: DbClient,
): Promise<AdminInviteRow[]> {
  const result = await client.query<{
    user_uuid: string;
    email: string;
    name: string;
    code: string | null;
    created_at: Date | null;
    rotated_at: Date | null;
  }>(
    `
    SELECT
      users.uuid AS user_uuid,
      users.email,
      users.name,
      user_invites.code,
      user_invites.created_at,
      user_invites.rotated_at
    FROM users
    LEFT JOIN user_invites ON user_invites.user_uuid = users.uuid
    WHERE users.deleted_at IS NULL
    ORDER BY users.created_at ASC, users.uuid ASC
    `,
  );

  return result.rows.map((row) => ({
    userUuid: row.user_uuid,
    email: row.email,
    name: row.name,
    code: row.code,
    createdAt: row.created_at,
    rotatedAt: row.rotated_at,
  }));
}

export async function rotateInviteCode(
  client: DbClient,
  input: {
    userUuid: string;
    code: string;
  },
): Promise<AdminInviteRow | null> {
  await client.query(
    `
    INSERT INTO user_invites (user_uuid, code)
    VALUES ($1, $2)
    ON CONFLICT (user_uuid) DO UPDATE
    SET code = EXCLUDED.code,
        rotated_at = now()
    `,
    [input.userUuid, input.code],
  );

  const result = await client.query<{
    user_uuid: string;
    email: string;
    name: string;
    code: string;
    created_at: Date;
    rotated_at: Date;
  }>(
    `
    SELECT
      users.uuid AS user_uuid,
      users.email,
      users.name,
      user_invites.code,
      user_invites.created_at,
      user_invites.rotated_at
    FROM users
    INNER JOIN user_invites ON user_invites.user_uuid = users.uuid
    WHERE users.uuid = $1
      AND users.deleted_at IS NULL
    `,
    [input.userUuid],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    userUuid: row.user_uuid,
    email: row.email,
    name: row.name,
    code: row.code,
    createdAt: row.created_at,
    rotatedAt: row.rotated_at,
  };
}

type AdminUserDbRow = {
  uuid: string;
  email: string;
  name: string;
  role: UserRole;
  enabled: boolean;
  token_prefix: string;
  created_at: Date;
  updated_at: Date;
  token_rotated_at: Date;
};

function mapAdminUser(row: AdminUserDbRow | undefined): AdminUserRow {
  if (!row) {
    throw new Error("expected admin user row");
  }

  return {
    uuid: row.uuid,
    email: row.email,
    name: row.name,
    role: row.role,
    enabled: row.enabled,
    tokenPrefix: row.token_prefix,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tokenRotatedAt: row.token_rotated_at,
  };
}
