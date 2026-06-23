import { afterEach, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DaemonConfig } from "@box-winder/config";
import { resolveProtocolPorts } from "@box-winder/core";
import {
  retryDelayMs,
  syncSingBox,
  systemctlRestartArgs,
  writeCheckedConfig,
} from "./daemon.worker.js";

const tempRoots: string[] = [];

afterEach(async () => {
  for (const root of tempRoots.splice(0)) {
    await rm(root, { force: true, recursive: true });
  }
});

describe("daemon worker utilities", () => {
  test("retryDelayMs grows and caps", () => {
    expect(retryDelayMs(1)).toBe(5_000);
    expect(retryDelayMs(2)).toBe(30_000);
    expect(retryDelayMs(3)).toBe(120_000);
    expect(retryDelayMs(4)).toBe(600_000);
    expect(retryDelayMs(5)).toBe(1_800_000);
    expect(retryDelayMs(99)).toBe(1_800_000);
  });

  test("writeCheckedConfig checks temp config before atomic rename", async () => {
    const root = await makeTempRoot();
    const configPath = join(root, "sing-box", "config.json");
    const calls: { command: string; args: readonly string[] }[] = [];

    await writeCheckedConfig({
      configPath,
      configText: '{"log":{"level":"info"}}\n',
      singBoxCommand: "sing-box",
      runCommand: async (command, args) => {
        calls.push({ command, args });
        expect(args[0]).toBe("check");
        expect(args[1]).toBe("-c");
        expect(args[2]).toContain(`${configPath}.`);
      },
    });

    expect(calls).toHaveLength(1);
    expect(await readFile(configPath, "utf8")).toBe(
      '{"log":{"level":"info"}}\n',
    );
  });

  test("syncSingBox renders, checks, writes, and restarts managed unit", async () => {
    const root = await makeTempRoot();
    const configPath = join(root, "sing-box", "config.json");
    const calls: { command: string; args: readonly string[] }[] = [];

    await syncSingBox({
      config: daemonConfig(configPath),
      users: [
        {
          uuid: "11111111-1111-1111-1111-111111111111",
          name: "Alice",
          token: "box_test_token",
        },
      ],
      runCommand: async (command, args) => {
        calls.push({ command, args });
      },
    });

    const rendered = JSON.parse(await readFile(configPath, "utf8"));
    expect(Array.isArray(rendered.inbounds)).toBe(true);
    expect(calls[0]?.command).toBe("sing-box");
    expect(calls[0]?.args[0]).toBe("check");
    expect(calls[0]?.args[1]).toBe("-c");
    expect(calls[0]?.args[2]).toContain(`${configPath}.`);
    expect(calls[1]).toEqual({
      command: "systemctl",
      args: ["restart", "sing-box@box-winder.service"],
    });
  });

  test("systemctlRestartArgs supports user-scoped units", () => {
    expect(
      systemctlRestartArgs("system", "sing-box@box-winder.service"),
    ).toEqual(["restart", "sing-box@box-winder.service"]);
    expect(systemctlRestartArgs("user", "sing-box@box-winder.service")).toEqual(
      ["--user", "restart", "sing-box@box-winder.service"],
    );
  });
});

async function makeTempRoot(): Promise<string> {
  const root = join(tmpdir(), `box-winder-daemon-${randomUUID()}`);
  await mkdir(root, { recursive: true });
  tempRoots.push(root);
  return root;
}

function daemonConfig(configPath: string): DaemonConfig {
  return {
    singBoxConfigPath: configPath,
    singBoxSystemdUnit: "sing-box@box-winder.service",
    singBoxCommand: "sing-box",
    systemctlCommand: "systemctl",
    systemdScope: "system",
    singBoxPortBase: 10_000,
    protocolPorts: resolveProtocolPorts(10_000),
    domainName: "example.com",
    acmeEmail: "admin@example.com",
    cloudflareApiToken: "cf-token",
    shadowTlsHandshakeServer: "apple.com",
    shadowTlsHandshakePort: 443,
  };
}
