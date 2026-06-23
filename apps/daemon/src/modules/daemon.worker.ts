import { spawn } from "node:child_process";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { DaemonConfig } from "@box-winder/config";
import { loadDaemonConfig } from "@box-winder/config";
import { renderSingBoxServerConfig } from "@box-winder/core";
import {
  claimOutboxEvents,
  createPgPool,
  listEnabledUsersForSingBox,
  markOutboxEventFailed,
  markOutboxEventProcessed,
  setSyncStatus,
  withTransaction,
} from "@box-winder/db";
import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";

const POLL_INTERVAL_MS = 2_000;
const CLAIM_LIMIT = 20;
const CLAIM_LEASE_MS = 30_000;
const RETRY_DELAYS_MS = [5_000, 30_000, 120_000, 600_000, 1_800_000] as const;

type CommandRunner = (
  command: string,
  args: readonly string[],
) => Promise<void>;

@Injectable()
export class DaemonWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DaemonWorker.name);
  private readonly config = loadDaemonConfig();
  private readonly pool = createPgPool();
  private stopped = false;
  private loopPromise: Promise<void> | null = null;

  onModuleInit(): void {
    this.loopPromise = this.runLoop();
  }

  async onModuleDestroy(): Promise<void> {
    this.stopped = true;
    await this.loopPromise;
    await this.pool.end();
  }

  private async runLoop(): Promise<void> {
    this.logger.log(
      `box-winder-daemon polling outbox; managed unit ${this.config.singBoxSystemdUnit}`,
    );

    while (!this.stopped) {
      try {
        const processed = await this.processOnce();

        if (processed === 0) {
          await sleep(POLL_INTERVAL_MS);
        }
      } catch (error) {
        this.logger.error(errorToMessage(error));
        await sleep(POLL_INTERVAL_MS);
      }
    }
  }

  async processOnce(): Promise<number> {
    const events = await withTransaction(this.pool, (client) =>
      claimOutboxEvents(client, {
        limit: CLAIM_LIMIT,
        leaseUntil: new Date(Date.now() + CLAIM_LEASE_MS),
      }),
    );

    if (events.length === 0) {
      return 0;
    }

    await setSyncStatus(this.pool, {
      status: "running",
      lastEventUuid: events.at(-1)?.uuid,
      lastError: null,
    });

    try {
      await syncSingBox({
        config: this.config,
        users: await listEnabledUsersForSingBox(this.pool),
      });

      await withTransaction(this.pool, async (client) => {
        for (const event of events) {
          await markOutboxEventProcessed(client, event.uuid);
        }

        await setSyncStatus(client, {
          status: "succeeded",
          lastEventUuid: events.at(-1)?.uuid,
          lastError: null,
          lastSuccessAt: new Date(),
        });
      });

      this.logger.log(`synced sing-box config for ${events.length} event(s)`);
    } catch (error) {
      const message = errorToMessage(error);

      await withTransaction(this.pool, async (client) => {
        for (const event of events) {
          const attempts = event.attempts + 1;
          await markOutboxEventFailed(client, {
            uuid: event.uuid,
            attempts,
            lastError: message,
            availableAt: new Date(Date.now() + retryDelayMs(attempts)),
          });
        }

        await setSyncStatus(client, {
          status: "failed",
          lastEventUuid: events.at(-1)?.uuid,
          lastError: message,
          lastFailureAt: new Date(),
        });
      });

      this.logger.error(`sync failed: ${message}`);
    }

    return events.length;
  }
}

export async function syncSingBox(input: {
  config: DaemonConfig;
  users: readonly { uuid: string; name: string; token: string }[];
  runCommand?: CommandRunner;
}): Promise<void> {
  const runCommand = input.runCommand ?? runCommandWithSpawn;
  const renderedConfig = renderSingBoxServerConfig({
    users: input.users,
    protocolPorts: input.config.protocolPorts,
    masterSecret: input.config.singBoxMasterSecret,
    tls: {
      enabled: true,
      server_name: input.config.domainName,
      acme: {
        domain: input.config.domainName,
        email: input.config.acmeEmail,
        dns01_challenge: {
          provider: "cloudflare",
          api_token: input.config.cloudflareApiToken,
        },
      },
    },
    shadowTlsHandshake: {
      server: input.config.shadowTlsHandshakeServer,
      server_port: input.config.shadowTlsHandshakePort,
    },
  });

  await writeCheckedConfig({
    configPath: input.config.singBoxConfigPath,
    configText: `${JSON.stringify(renderedConfig, null, 2)}\n`,
    singBoxCommand: input.config.singBoxCommand,
    runCommand,
  });

  await runCommand(
    input.config.systemctlCommand,
    systemctlRestartArgs(
      input.config.systemdScope,
      input.config.singBoxSystemdUnit,
    ),
  );
}

export async function writeCheckedConfig(input: {
  configPath: string;
  configText: string;
  singBoxCommand: string;
  runCommand?: CommandRunner;
}): Promise<void> {
  const runCommand = input.runCommand ?? runCommandWithSpawn;
  const directory = dirname(input.configPath);
  const tmpPath = `${input.configPath}.${process.pid}.${Date.now()}.tmp`;

  await mkdir(directory, { recursive: true });
  await writeFile(tmpPath, input.configText, "utf8");

  try {
    await runCommand(input.singBoxCommand, ["check", "-c", tmpPath]);
    await rename(tmpPath, input.configPath);
  } catch (error) {
    await rm(tmpPath, { force: true });
    throw error;
  }
}

export function retryDelayMs(attempts: number): number {
  const index = Math.max(0, Math.min(attempts - 1, RETRY_DELAYS_MS.length - 1));
  return RETRY_DELAYS_MS[index];
}

export function systemctlRestartArgs(
  scope: DaemonConfig["systemdScope"],
  unit: string,
): string[] {
  return scope === "user" ? ["--user", "restart", unit] : ["restart", unit];
}

async function runCommandWithSpawn(
  command: string,
  args: readonly string[],
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, [...args], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    child.stdout.on("data", (chunk) => stdout.push(Buffer.from(chunk)));
    child.stderr.on("data", (chunk) => stderr.push(Buffer.from(chunk)));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      const output = [...stdout, ...stderr]
        .map((chunk) => chunk.toString("utf8"))
        .join("")
        .trim();
      reject(
        new Error(
          `${command} ${args.join(" ")} failed with exit code ${code}${
            output ? `: ${output}` : ""
          }`,
        ),
      );
    });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorToMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
