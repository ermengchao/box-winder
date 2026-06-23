import { describe, expect, test } from "bun:test";
import {
  claimOutboxEvents,
  markOutboxEventFailed,
  setSyncStatus,
} from "./outbox.js";
import type { DbClient } from "./postgres.js";
import { listEnabledUsersForSingBox } from "./users.js";

class FakeClient {
  queries: { sql: string; values?: unknown[] }[] = [];
  rows: unknown[] = [];

  async query(sql: string, values?: unknown[]) {
    this.queries.push({ sql, values });
    return { rows: this.rows };
  }
}

describe("outbox helpers", () => {
  test("claimOutboxEvents uses FOR UPDATE SKIP LOCKED and leases rows", async () => {
    const client = new FakeClient();
    const leaseUntil = new Date("2026-01-01T00:00:30.000Z");
    client.rows = [
      {
        uuid: "11111111-1111-1111-1111-111111111111",
        event_type: "user.updated",
        aggregate_type: "user",
        aggregate_uuid: "22222222-2222-2222-2222-222222222222",
        payload: { userUuid: "22222222-2222-2222-2222-222222222222" },
        available_at: leaseUntil,
        processed_at: null,
        failed_at: null,
        attempts: 0,
        last_error: null,
        created_at: new Date("2026-01-01T00:00:00.000Z"),
      },
    ];

    const events = await claimOutboxEvents(client as unknown as DbClient, {
      limit: 7,
      leaseUntil,
    });

    expect(client.queries[0]?.sql).toContain("FOR UPDATE SKIP LOCKED");
    expect(client.queries[0]?.sql).toContain("SET available_at = $2");
    expect(client.queries[0]?.values).toEqual([7, leaseUntil]);
    expect(events[0]?.eventType).toBe("user.updated");
  });

  test("markOutboxEventFailed records attempts, error, and retry availability", async () => {
    const client = new FakeClient();
    const availableAt = new Date("2026-01-01T00:05:00.000Z");

    await markOutboxEventFailed(client as unknown as DbClient, {
      uuid: "11111111-1111-1111-1111-111111111111",
      attempts: 2,
      lastError: "check failed",
      availableAt,
    });

    expect(client.queries[0]?.sql).toContain("SET attempts = $2");
    expect(client.queries[0]?.sql).toContain("failed_at = now()");
    expect(client.queries[0]?.values).toEqual([
      "11111111-1111-1111-1111-111111111111",
      2,
      "check failed",
      availableAt,
    ]);
  });

  test("listEnabledUsersForSingBox excludes disabled and deleted users", async () => {
    const client = new FakeClient();

    await listEnabledUsersForSingBox(client as unknown as DbClient);

    expect(client.queries[0]?.sql).toContain("enabled = TRUE");
    expect(client.queries[0]?.sql).toContain("deleted_at IS NULL");
    expect(client.queries[0]?.sql).toContain("ORDER BY created_at ASC");
  });

  test("setSyncStatus updates singleton status row", async () => {
    const client = new FakeClient();

    await setSyncStatus(client as unknown as DbClient, {
      status: "succeeded",
      lastEventUuid: "11111111-1111-1111-1111-111111111111",
      lastSuccessAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(client.queries[0]?.sql).toContain("ON CONFLICT (id) DO UPDATE");
    expect(client.queries[0]?.values?.[0]).toBe("succeeded");
  });
});
