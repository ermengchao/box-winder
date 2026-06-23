#!/usr/bin/env bun
import { createInterface } from "node:readline/promises";
import { generateInviteCode, generateUserSecrets } from "@box-winder/core";
import {
  countActiveAdmins,
  createPgPool,
  insertManagedUser,
  insertOutboxEvent,
  rotateInviteCode,
  withTransaction,
} from "@box-winder/db";
import { Command } from "commander";

const program = new Command()
  .name("bootstrap-admin")
  .description("Create the first box-winder admin user")
  .option("--email <email>", "admin email")
  .option("--password <password>", "admin password")
  .option("--name <name>", "admin display name", "Admin");

program.parse();

const options = program.opts<{
  email?: string;
  password?: string;
  name: string;
}>();

const email = options.email?.trim() || (await promptText("Admin email: "));
const password = options.password || (await promptPassword("Admin password: "));
const name = options.name?.trim() || "Admin";

if (!email.trim()) {
  throw new Error("admin email cannot be empty");
}

if (!password) {
  throw new Error("admin password cannot be empty");
}

const pool = createPgPool();

try {
  const result = await withTransaction(pool, async (client) => {
    if ((await countActiveAdmins(client)) > 0) {
      return { created: false as const };
    }

    const secrets = await generateUserSecrets(password);
    const user = await insertManagedUser(client, {
      name,
      email,
      passwordHash: secrets.passwordHash,
      token: secrets.token,
      tokenPrefix: secrets.tokenPrefix,
      role: "admin",
      enabled: true,
    });
    const invite = await rotateInviteCode(client, {
      userUuid: user.uuid,
      code: generateInviteCode().inviteCode,
    });

    await insertOutboxEvent(client, {
      eventType: "user.registered",
      aggregateType: "user",
      aggregateUuid: user.uuid,
      payload: { userUuid: user.uuid },
    });
    await insertOutboxEvent(client, {
      eventType: "invite.rotated",
      aggregateType: "user",
      aggregateUuid: user.uuid,
      payload: { userUuid: user.uuid },
    });

    return {
      created: true as const,
      uuid: user.uuid,
      email: user.email,
      tokenPrefix: user.tokenPrefix,
      inviteCode: invite?.code ?? null,
    };
  });

  if (!result.created) {
    console.log("An active admin already exists; nothing changed.");
  } else {
    console.log(
      JSON.stringify(
        {
          uuid: result.uuid,
          email: result.email,
          tokenPrefix: result.tokenPrefix,
          inviteCode: result.inviteCode,
        },
        null,
        2,
      ),
    );
  }
} finally {
  await pool.end();
}

async function promptText(message: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    return (await rl.question(message)).trim();
  } finally {
    rl.close();
  }
}

async function promptPassword(message: string): Promise<string> {
  process.stdout.write(message);
  const stdin = process.stdin;
  const wasRaw = stdin.isRaw;
  stdin.setRawMode?.(true);
  stdin.resume();

  return new Promise<string>((resolve, reject) => {
    let value = "";

    const cleanup = () => {
      stdin.off("data", onData);
      stdin.setRawMode?.(wasRaw);
      stdin.pause();
      process.stdout.write("\n");
    };

    const onData = (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      if (text === "\u0003") {
        cleanup();
        reject(new Error("interrupted"));
        return;
      }

      if (text === "\r" || text === "\n") {
        cleanup();
        resolve(value);
        return;
      }

      if (text === "\u007f") {
        value = value.slice(0, -1);
        return;
      }

      value += text;
    };

    stdin.on("data", onData);
  });
}
