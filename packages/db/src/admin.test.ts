import { describe, expect, test } from "bun:test";
import {
  countActiveAdmins,
  findActiveSessionUser,
  listAdminUsers,
  rotateInviteCode,
  softDeleteAdminUser,
} from "./admin.js";
import type { DbClient } from "./postgres.js";

class FakeClient {
  queries: { sql: string; values?: unknown[] }[] = [];
  rows: unknown[] = [];

  async query(sql: string, values?: unknown[]) {
    this.queries.push({ sql, values });
    return { rows: this.rows, rowCount: 1 };
  }
}

describe("admin db helpers", () => {
  test("findActiveSessionUser requires active session and enabled user", async () => {
    const client = new FakeClient();

    await findActiveSessionUser(client as unknown as DbClient, {
      userUuid: "user-uuid",
      sessionUuid: "session-uuid",
    });

    expect(client.queries[0]?.sql).toContain("sessions.revoked_at IS NULL");
    expect(client.queries[0]?.sql).toContain("sessions.expires_at > now()");
    expect(client.queries[0]?.sql).toContain("users.enabled = TRUE");
    expect(client.queries[0]?.sql).toContain("users.deleted_at IS NULL");
    expect(client.queries[0]?.values).toEqual(["session-uuid", "user-uuid"]);
  });

  test("listAdminUsers excludes deleted users", async () => {
    const client = new FakeClient();

    await listAdminUsers(client as unknown as DbClient);

    expect(client.queries[0]?.sql).toContain("WHERE deleted_at IS NULL");
    expect(client.queries[0]?.sql).toContain("ORDER BY created_at ASC");
  });

  test("softDeleteAdminUser updates deleted_at instead of deleting rows", async () => {
    const client = new FakeClient();

    const deleted = await softDeleteAdminUser(
      client as unknown as DbClient,
      "user-uuid",
    );

    expect(deleted).toBe(true);
    expect(client.queries[0]?.sql).toContain("SET deleted_at = now()");
    expect(client.queries[0]?.sql).not.toContain("DELETE FROM users");
  });

  test("countActiveAdmins counts enabled undeleted admins", async () => {
    const client = new FakeClient();
    client.rows = [{ count: "2" }];

    const count = await countActiveAdmins(client as unknown as DbClient);

    expect(count).toBe(2);
    expect(client.queries[0]?.sql).toContain("role = 'admin'");
    expect(client.queries[0]?.sql).toContain("enabled = TRUE");
    expect(client.queries[0]?.sql).toContain("deleted_at IS NULL");
  });

  test("rotateInviteCode upserts by user uuid", async () => {
    const client = new FakeClient();

    await rotateInviteCode(client as unknown as DbClient, {
      userUuid: "user-uuid",
      code: "invite",
    });

    expect(client.queries[0]?.sql).toContain("ON CONFLICT (user_uuid)");
    expect(client.queries[0]?.values).toEqual(["user-uuid", "invite"]);
  });
});
