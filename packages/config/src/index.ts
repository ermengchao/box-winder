import { homedir } from "node:os";
import { join } from "node:path";
import {
  DEFAULT_SING_BOX_PORT_BASE,
  resolveProtocolPorts,
} from "@box-winder/core";

export type DurationString = `${number}${"s" | "m" | "h" | "d"}`;

export const DEFAULT_JWT_EXPIRES_IN: DurationString = "8h";
export const DEFAULT_API_BASE_URL = "http://localhost:12000";
export const DEFAULT_API_CORS_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];
export const DEFAULT_SING_BOX_CONFIG_PATH =
  "/var/lib/box-winder/sing-box/config.json";
export const DEFAULT_SING_BOX_SYSTEMD_UNIT = "sing-box@box-winder.service";
export const DEFAULT_SING_BOX_COMMAND = "sing-box";
export const DEFAULT_SYSTEMCTL_COMMAND = "systemctl";
export const DEFAULT_SYSTEMD_SCOPE: SystemdScope = "system";
export const DEFAULT_SUBSCRIPTION_TEMPLATE_DIR =
  "assets/templates/subscriptions";
export const DEFAULT_SHADOWTLS_HANDSHAKE_SERVER = "apple.com";
export const DEFAULT_SHADOWTLS_HANDSHAKE_PORT = 443;

export type SystemdScope = "system" | "user";
export type ApiConfig = {
  host: string;
  port: number;
  corsOrigins: string[];
  jwtExpiresIn: DurationString;
  jwtSecret: string;
};

export type DaemonConfig = {
  singBoxConfigPath: string;
  singBoxSystemdUnit: string;
  singBoxCommand: string;
  systemctlCommand: string;
  systemdScope: SystemdScope;
  singBoxPortBase: number;
  protocolPorts: ReturnType<typeof resolveProtocolPorts>;
  domainName: string;
  acmeEmail: string;
  cloudflareApiToken: string;
  shadowTlsHandshakeServer: string;
  shadowTlsHandshakePort: number;
  singBoxMasterSecret?: string;
};

export type CliConfig = {
  apiBaseUrl: string;
};

export function loadApiConfig(env = process.env): ApiConfig {
  return {
    host: env.HOST ?? "0.0.0.0",
    port: readInteger(env.PORT, 12000),
    corsOrigins: readCsv(env.API_CORS_ORIGINS, DEFAULT_API_CORS_ORIGINS),
    jwtExpiresIn: readDuration(env.JWT_EXPIRES_IN, DEFAULT_JWT_EXPIRES_IN),
    jwtSecret: env.JWT_SECRET ?? "dev-secret-change-me",
  };
}

export function loadDaemonConfig(env = process.env): DaemonConfig {
  const singBoxPortBase = readInteger(
    env.SING_BOX_PORT_BASE,
    DEFAULT_SING_BOX_PORT_BASE,
  );
  const systemdScope = readSystemdScope(env.BOX_WINDER_SYSTEMD_SCOPE);

  return {
    singBoxConfigPath:
      env.BOX_WINDER_SING_BOX_CONFIG_PATH ??
      defaultSingBoxConfigPath(systemdScope, env),
    singBoxSystemdUnit:
      env.BOX_WINDER_SING_BOX_SYSTEMD_UNIT ?? DEFAULT_SING_BOX_SYSTEMD_UNIT,
    singBoxCommand: env.SING_BOX_COMMAND ?? DEFAULT_SING_BOX_COMMAND,
    systemctlCommand: env.SYSTEMCTL_COMMAND ?? DEFAULT_SYSTEMCTL_COMMAND,
    systemdScope,
    singBoxPortBase,
    protocolPorts: resolveProtocolPorts(singBoxPortBase),
    domainName: readRequiredString(env.DOMAIN_NAME, "DOMAIN_NAME"),
    acmeEmail: readRequiredString(env.ACME_EMAIL, "ACME_EMAIL"),
    cloudflareApiToken: readRequiredString(
      env.CLOUDFLARE_API_TOKEN,
      "CLOUDFLARE_API_TOKEN",
    ),
    shadowTlsHandshakeServer:
      env.SHADOWTLS_HANDSHAKE_SERVER ?? DEFAULT_SHADOWTLS_HANDSHAKE_SERVER,
    shadowTlsHandshakePort: readInteger(
      env.SHADOWTLS_HANDSHAKE_PORT,
      DEFAULT_SHADOWTLS_HANDSHAKE_PORT,
    ),
    singBoxMasterSecret: env.SING_BOX_MASTER_SECRET || undefined,
  };
}

export function loadCliConfig(env = process.env): CliConfig {
  return {
    apiBaseUrl: env.API_BASE_URL ?? DEFAULT_API_BASE_URL,
  };
}

function readInteger(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function readRequiredString(value: string | undefined, name: string): string {
  if (!value?.trim()) {
    throw new Error(`${name} is required for box-winder-daemon`);
  }

  return value.trim();
}

function readCsv(value: string | undefined, fallback: string[]): string[] {
  const values = value
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return values?.length ? values : fallback;
}

export function expiresInToDate(expiresIn: string, now = new Date()): Date {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error("JWT_EXPIRES_IN must use a duration like 30m, 8h, or 7d");
  }

  const amount = Number.parseInt(match[1] ?? "", 10);
  const unit = match[2];
  const multiplier = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  }[unit];

  if (!multiplier) {
    throw new Error("JWT_EXPIRES_IN has an unsupported duration unit");
  }

  return new Date(now.getTime() + amount * multiplier);
}

function readDuration(
  value: string | undefined,
  fallback: DurationString,
): DurationString {
  if (!value) {
    return fallback;
  }

  if (!/^\d+[smhd]$/.test(value)) {
    throw new Error("JWT_EXPIRES_IN must use a duration like 30m, 8h, or 7d");
  }

  return value as DurationString;
}

function readSystemdScope(value: string | undefined): SystemdScope {
  if (!value) {
    return DEFAULT_SYSTEMD_SCOPE;
  }

  if (value !== "system" && value !== "user") {
    throw new Error('BOX_WINDER_SYSTEMD_SCOPE must be "system" or "user"');
  }

  return value;
}

function defaultSingBoxConfigPath(
  scope: SystemdScope,
  env: NodeJS.ProcessEnv,
): string {
  if (scope === "user") {
    return join(
      env.XDG_STATE_HOME ?? join(homedir(), ".local", "state"),
      "box-winder",
      "sing-box",
      "config.json",
    );
  }

  return DEFAULT_SING_BOX_CONFIG_PATH;
}
