import type { DbClient } from "./postgres.js";

export type OutboxEventType =
  | "user.registered"
  | "user.updated"
  | "user.deleted"
  | "user.token_rotated"
  | "user.enabled_changed"
  | "invite.rotated"
  | "sync.requested";

export type SyncStatus =
  | "idle"
  | "pending"
  | "running"
  | "succeeded"
  | "failed";

export type OutboxEvent = {
  uuid: string;
  eventType: OutboxEventType | string;
  aggregateType: string;
  aggregateUuid: string | null;
  payload: Record<string, unknown>;
  availableAt: Date;
  processedAt: Date | null;
  failedAt: Date | null;
  attempts: number;
  lastError: string | null;
  createdAt: Date;
};

export type DbSyncStatus = {
  status: SyncStatus | string;
  lastEventUuid: string | null;
  lastSuccessAt: Date | null;
  lastFailureAt: Date | null;
  lastError: string | null;
  updatedAt: Date;
};

type OutboxEventRow = {
  uuid: string;
  event_type: string;
  aggregate_type: string;
  aggregate_uuid: string | null;
  payload: Record<string, unknown>;
  available_at: Date;
  processed_at: Date | null;
  failed_at: Date | null;
  attempts: number;
  last_error: string | null;
  created_at: Date;
};

export async function claimOutboxEvents(
  client: DbClient,
  input: {
    limit?: number;
    leaseUntil?: Date;
  } = {},
): Promise<OutboxEvent[]> {
  const limit = input.limit ?? 20;
  const leaseUntil = input.leaseUntil ?? new Date(Date.now() + 30_000);

  const result = await client.query<OutboxEventRow>(
    `
    WITH claimed AS (
      SELECT uuid
      FROM outbox_events
      WHERE processed_at IS NULL
        AND available_at <= now()
      ORDER BY created_at ASC
      LIMIT $1
      FOR UPDATE SKIP LOCKED
    )
    UPDATE outbox_events event
    SET available_at = $2
    FROM claimed
    WHERE event.uuid = claimed.uuid
    RETURNING
      event.uuid,
      event.event_type,
      event.aggregate_type,
      event.aggregate_uuid,
      event.payload,
      event.available_at,
      event.processed_at,
      event.failed_at,
      event.attempts,
      event.last_error,
      event.created_at
    `,
    [limit, leaseUntil],
  );

  return result.rows.map(mapOutboxEvent);
}

export async function markOutboxEventProcessed(
  client: DbClient,
  uuid: string,
): Promise<void> {
  await client.query(
    `
    UPDATE outbox_events
    SET processed_at = now(),
        failed_at = NULL,
        last_error = NULL
    WHERE uuid = $1
    `,
    [uuid],
  );
}

export async function markOutboxEventFailed(
  client: DbClient,
  input: {
    uuid: string;
    attempts: number;
    lastError: string;
    availableAt: Date;
  },
): Promise<void> {
  await client.query(
    `
    UPDATE outbox_events
    SET attempts = $2,
        last_error = $3,
        failed_at = now(),
        available_at = $4
    WHERE uuid = $1
      AND processed_at IS NULL
    `,
    [input.uuid, input.attempts, input.lastError, input.availableAt],
  );
}

export async function setSyncStatus(
  client: DbClient,
  input: {
    status: SyncStatus;
    lastEventUuid?: string | null;
    lastError?: string | null;
    lastSuccessAt?: Date | null;
    lastFailureAt?: Date | null;
  },
): Promise<void> {
  await client.query(
    `
    INSERT INTO sync_status (
      id,
      status,
      last_event_uuid,
      last_success_at,
      last_failure_at,
      last_error,
      updated_at
    )
    VALUES (TRUE, $1, $2, $3, $4, $5, now())
    ON CONFLICT (id) DO UPDATE
    SET status = EXCLUDED.status,
        last_event_uuid = COALESCE(EXCLUDED.last_event_uuid, sync_status.last_event_uuid),
        last_success_at = COALESCE(EXCLUDED.last_success_at, sync_status.last_success_at),
        last_failure_at = COALESCE(EXCLUDED.last_failure_at, sync_status.last_failure_at),
        last_error = EXCLUDED.last_error,
        updated_at = now()
    `,
    [
      input.status,
      input.lastEventUuid ?? null,
      input.lastSuccessAt ?? null,
      input.lastFailureAt ?? null,
      input.lastError ?? null,
    ],
  );
}

export async function getSyncStatus(client: DbClient): Promise<DbSyncStatus> {
  const result = await client.query<{
    status: string;
    last_event_uuid: string | null;
    last_success_at: Date | null;
    last_failure_at: Date | null;
    last_error: string | null;
    updated_at: Date;
  }>(
    `
    SELECT
      status,
      last_event_uuid,
      last_success_at,
      last_failure_at,
      last_error,
      updated_at
    FROM sync_status
    WHERE id = TRUE
    `,
  );

  const row = result.rows[0];
  if (!row) {
    return {
      status: "idle",
      lastEventUuid: null,
      lastSuccessAt: null,
      lastFailureAt: null,
      lastError: null,
      updatedAt: new Date(0),
    };
  }

  return {
    status: row.status,
    lastEventUuid: row.last_event_uuid,
    lastSuccessAt: row.last_success_at,
    lastFailureAt: row.last_failure_at,
    lastError: row.last_error,
    updatedAt: row.updated_at,
  };
}

function mapOutboxEvent(row: OutboxEventRow): OutboxEvent {
  return {
    uuid: row.uuid,
    eventType: row.event_type,
    aggregateType: row.aggregate_type,
    aggregateUuid: row.aggregate_uuid,
    payload: row.payload,
    availableAt: row.available_at,
    processedAt: row.processed_at,
    failedAt: row.failed_at,
    attempts: row.attempts,
    lastError: row.last_error,
    createdAt: row.created_at,
  };
}
