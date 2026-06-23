# box-winder

TypeScript control plane for managing a box-winder-owned sing-box runtime.

The project is a Bun workspace with a Next.js web app, NestJS API, daemon
worker, CLI, shared core rendering logic, and PostgreSQL database helpers.

## Architecture

```text
apps/web or apps/cli
-> apps/api
-> PostgreSQL users, sessions, invites, outbox events, sync status
-> apps/daemon
-> rendered sing-box server config
-> box-winder-managed sing-box systemd unit
```

PostgreSQL is the source of truth. Generated sing-box configs and
subscriptions are derived artifacts and can be rebuilt from database state plus
environment configuration.

## Workspace Layout

```text
apps/
  web/       Next.js frontend
  api/       NestJS HTTP and GraphQL API
  daemon/    outbox worker that renders and restarts managed sing-box
  cli/       operational CLI scripts
packages/
  core/      token, credential, port, server config, and subscription rendering
  db/        migrations and PostgreSQL helpers
  config/    shared environment loading
  contracts/ shared API types
assets/      static templates and frontend static assets
deploy/      systemd unit files
```

## Requirements

- Bun
- PostgreSQL
- sing-box
- systemd for self-hosted daemon operation
- mise is recommended for local environment activation

## Local Development

Install dependencies:

```fish
bun install
```

Run checks:

```fish
bun test
bun run typecheck
bun run lint
bun run build
```

Run services:

```fish
bun run dev:web
bun run dev:api
bun run dev:daemon
```

Run database migrations:

```fish
bun run db:migrate
```

Bootstrap the first admin user:

```fish
bun run bootstrap -- --email admin@example.com --password 'change-me' --name Admin
```

If `--email` or `--password` is omitted, the bootstrap script prompts
interactively. The password prompt does not echo input.

## Environment

Local defaults live in `mise.toml`. Private values should go in
`mise.local.toml`, which is ignored by git.

Important variables:

```env
NODE_ENV=production

HOST=0.0.0.0
PORT=12000
JWT_EXPIRES_IN=8h
JWT_SECRET=change-me
API_CORS_ORIGINS=https://console.example.com

DATABASE_URL=postgres://box_winder:change-me@127.0.0.1:5432/box_winder

SING_BOX_PORT_BASE=12000
BOX_WINDER_SYSTEMD_SCOPE=user
BOX_WINDER_SING_BOX_SYSTEMD_UNIT=sing-box@box-winder.service

SING_BOX_MASTER_SECRET=
SING_BOX_COMMAND=sing-box
SYSTEMCTL_COMMAND=systemctl

DOMAIN_NAME=example.com
ACME_EMAIL=admin@example.com
CLOUDFLARE_API_TOKEN=change-me
SHADOWTLS_HANDSHAKE_SERVER=apple.com
SHADOWTLS_HANDSHAKE_PORT=443

NODE_LOCATION=JP
SUBSCRIPTION_TEMPLATE_DIR=assets/templates/subscriptions
API_BASE_URL=https://api.example.com
```

`BOX_WINDER_SYSTEMD_SCOPE` can be `user` or `system`.

For user scope, the daemon restarts sing-box with:

```fish
systemctl --user restart sing-box@box-winder.service
```

For system scope, it uses:

```fish
systemctl restart sing-box@box-winder.service
```

If `BOX_WINDER_SING_BOX_CONFIG_PATH` is not set, user scope defaults to:

```text
~/.local/state/box-winder/sing-box/config.json
```

System scope defaults to:

```text
/var/lib/box-winder/sing-box/config.json
```

## Rendering systemd EnvironmentFile

Render an EnvironmentFile from the currently active environment:

```fish
bun run systemd:env -- --print
```

Write it to the default path for the active scope:

```fish
bun run systemd:env
```

Write to an explicit path:

```fish
bun run systemd:env -- --out ~/.config/box-winder/box-winder.env
```

With mise:

```fish
mise run systemd-env
```

The renderer requires these production values:

- `JWT_SECRET`
- `DATABASE_URL`
- `DOMAIN_NAME`
- `ACME_EMAIL`
- `CLOUDFLARE_API_TOKEN`

## User systemd Deployment

User units are recommended for self-hosted installations that should not
interfere with system-level sing-box services.

Suggested paths:

```text
unit files:      ~/.config/systemd/user/
env file:        ~/.config/box-winder/box-winder.env
runtime config:  ~/.local/state/box-winder/sing-box/config.json
```

Prepare directories and render the environment file:

```fish
mkdir -p ~/.config/systemd/user ~/.config/box-winder ~/.local/state/box-winder/sing-box
bun run systemd:env -- --scope user --out ~/.config/box-winder/box-winder.env
```

Create `~/.config/systemd/user/box-winder-api.service`:

```ini
[Unit]
Description=box-winder API
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/opt/box-winder
Environment=NODE_ENV=production
EnvironmentFile=%h/.config/box-winder/box-winder.env
ExecStart=/usr/bin/env bun run --cwd apps/api start
Restart=on-failure
RestartSec=5s
TimeoutStopSec=30s
KillSignal=SIGTERM

[Install]
WantedBy=default.target
```

Create `~/.config/systemd/user/box-winder-daemon.service`:

```ini
[Unit]
Description=box-winder daemon worker
After=network-online.target sing-box@box-winder.service
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/opt/box-winder
Environment=NODE_ENV=production
EnvironmentFile=%h/.config/box-winder/box-winder.env
ExecStart=/usr/bin/env bun run --cwd apps/daemon start
Restart=on-failure
RestartSec=5s
TimeoutStopSec=30s
KillSignal=SIGTERM

[Install]
WantedBy=default.target
```

Create `~/.config/systemd/user/sing-box@.service`:

```ini
[Unit]
Description=box-winder managed sing-box instance %i
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
EnvironmentFile=%h/.config/box-winder/box-winder.env
ExecStart=/usr/bin/env sing-box run -c %h/.local/state/box-winder/sing-box/config.json
Restart=on-failure
RestartSec=5s
LimitNOFILE=1048576

[Install]
WantedBy=default.target
```

Then enable the user services:

```fish
systemctl --user daemon-reload
systemctl --user enable --now box-winder-api.service
systemctl --user enable --now box-winder-daemon.service
systemctl --user enable sing-box@box-winder.service
```

Adjust `WorkingDirectory=/opt/box-winder` if the repository is deployed
elsewhere.

## System systemd Deployment

System units are useful when box-winder runs under a dedicated Unix user and
uses `/var/lib/box-winder`.

```fish
sudo useradd --system --home /var/lib/box-winder --shell /usr/sbin/nologin box-winder
sudo mkdir -p /etc/box-winder /var/lib/box-winder/sing-box /var/log/box-winder /run/box-winder
sudo chown -R box-winder:box-winder /var/lib/box-winder /var/log/box-winder /run/box-winder

sudo install -m 0644 deploy/systemd/box-winder-api.service /etc/systemd/system/box-winder-api.service
sudo install -m 0644 deploy/systemd/box-winder-daemon.service /etc/systemd/system/box-winder-daemon.service
sudo install -m 0644 deploy/systemd/sing-box@.service /etc/systemd/system/sing-box@.service

bun run systemd:env -- --scope system --out /tmp/box-winder.env
sudo install -m 0600 /tmp/box-winder.env /etc/box-winder/box-winder.env

sudo systemctl daemon-reload
sudo systemctl enable --now box-winder-api.service
sudo systemctl enable --now box-winder-daemon.service
sudo systemctl enable sing-box@box-winder.service
```

If `box-winder-daemon.service` runs as the `box-winder` user and manages a
system unit, the host must allow that exact restart operation through sudoers or
polkit. Do not grant broad permission to manage arbitrary services.

## Managed sing-box Boundary

box-winder manages only the configured unit:

```env
BOX_WINDER_SING_BOX_SYSTEMD_UNIT=sing-box@box-winder.service
```

The daemon renders the service config, checks it with `sing-box check`, writes
it atomically, then restarts only that unit. It does not mutate existing
user/system sing-box configs and does not restart unrelated sing-box processes.

## API

The API keeps REST auth compatibility and exposes the admin surface through
GraphQL:

- `GET /health`
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /graphql`

GraphQL admin operations require a valid JWT, an active non-revoked database
session, an enabled non-deleted user, and `role = "admin"`.
