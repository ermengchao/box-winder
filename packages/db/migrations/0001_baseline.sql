CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('admin', 'user');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS users (
  uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'user',
  token TEXT NOT NULL UNIQUE,
  token_prefix TEXT NOT NULL,
  invited_by_uuid UUID REFERENCES users(uuid),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  token_rotated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_invites (
  user_uuid UUID PRIMARY KEY REFERENCES users(uuid) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rotated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_uuid UUID NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,
  jwt_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  user_agent TEXT,
  ip_address INET
);

CREATE TABLE IF NOT EXISTS outbox_events (
  uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_uuid UUID,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS outbox_events_ready_idx
  ON outbox_events (available_at, created_at)
  WHERE processed_at IS NULL;

CREATE TABLE IF NOT EXISTS sync_status (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'idle',
  last_event_uuid UUID REFERENCES outbox_events(uuid),
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  last_error TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sync_status_singleton CHECK (id)
);

INSERT INTO sync_status (id)
VALUES (TRUE)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS audit_logs (
  uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_uuid UUID REFERENCES users(uuid),
  action TEXT NOT NULL,
  subject_type TEXT NOT NULL,
  subject_uuid UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
