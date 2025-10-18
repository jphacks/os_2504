import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, PoolConfig } from 'pg';
import * as schema from './schema.js';

const DEFAULT_DATABASE_URL = 'postgresql://postgres:postgres@db:5432/app?sslmode=disable';
const connectionString = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;

const poolConfig: PoolConfig = {
  connectionString
};

const maxConnections = Number(process.env.DB_MAX_CONNECTIONS);
if (Number.isInteger(maxConnections) && maxConnections > 0) {
  poolConfig.max = maxConnections;
}

const shouldEnableSsl = (process.env.DB_SSL ?? '').toLowerCase() === 'true';
if (shouldEnableSsl) {
  const strictSsl = (process.env.DB_SSL_STRICT ?? '').toLowerCase() === 'true';
  poolConfig.ssl = strictSsl ? true : { rejectUnauthorized: false };
}

export const pool = new Pool(poolConfig);
export const db = drizzle(pool, { schema });

let initPromise: Promise<void> | null = null;

async function createTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS todos (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      done BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function ensureDatabase() {
  if (!initPromise) {
    initPromise = createTables();
  }
  return initPromise;
}

export { schema };
