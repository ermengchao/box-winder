import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createPgPool, withTransaction } from "./postgres.js";

const MIGRATIONS_TABLE = "box_winder_migrations";

type AppliedMigration = {
  name: string;
  checksum: string;
};

const migrationsDir = fileURLToPath(new URL("../migrations", import.meta.url));
const pool = createPgPool();

try {
  const applied = await runMigrations();
  if (applied.length === 0) {
    console.log("Database is already up to date.");
  } else {
    for (const migration of applied) {
      console.log(`Applied ${migration.name}`);
    }
  }
} finally {
  await pool.end();
}

async function runMigrations(): Promise<AppliedMigration[]> {
  const migrationFiles = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  return withTransaction(pool, async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
        name TEXT PRIMARY KEY,
        checksum TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const existingResult = await client.query<AppliedMigration>(
      `SELECT name, checksum FROM ${MIGRATIONS_TABLE}`,
    );
    const existing = new Map(
      existingResult.rows.map((row) => [row.name, row.checksum]),
    );
    const applied: AppliedMigration[] = [];

    for (const file of migrationFiles) {
      const path = join(migrationsDir, file);
      const sql = await readFile(path, "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      const name = basename(file);
      const existingChecksum = existing.get(name);

      if (existingChecksum) {
        if (existingChecksum !== checksum) {
          throw new Error(
            `Migration ${name} checksum mismatch; refusing to continue`,
          );
        }

        continue;
      }

      await client.query(sql);
      await client.query(
        `INSERT INTO ${MIGRATIONS_TABLE} (name, checksum) VALUES ($1, $2)`,
        [name, checksum],
      );
      applied.push({ name, checksum });
    }

    return applied;
  });
}
