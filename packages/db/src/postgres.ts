import pg from "pg";

const { Pool } = pg;

export type DbClient = pg.Pool | pg.PoolClient;
export type PgPool = pg.Pool;
export type PgPoolClient = pg.PoolClient;

export function createPgPool(databaseUrl = process.env.DATABASE_URL): PgPool {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  return new Pool({
    connectionString: databaseUrl,
  });
}

export async function withTransaction<T>(
  pool: PgPool,
  callback: (client: PgPoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
