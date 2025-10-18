import { drizzle as drizzleNode } from 'drizzle-orm/node-postgres';
import { drizzle as drizzleVercel } from 'drizzle-orm/vercel-postgres';
import { sql as vercelSql } from '@vercel/postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

const DEFAULT_DATABASE_URL = 'postgresql://postgres:postgres@db:5432/app?sslmode=disable';
const isVercel = Boolean(process.env.VERCEL);

const pool = isVercel
  ? null
  : new Pool({
      connectionString: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL
    });

export const db = isVercel
  ? drizzleVercel(vercelSql, { schema })
  : drizzleNode(pool!, { schema });

let initPromise: Promise<void> | null = null;

async function createTables() {
  if (isVercel) {
    await vercelSql`
      CREATE TABLE IF NOT EXISTS todos (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        done BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
  } else {
    await pool!.query(`
      CREATE TABLE IF NOT EXISTS todos (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        done BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }
}

export async function ensureDatabase() {
  if (!initPromise) {
    initPromise = createTables();
  }
  return initPromise;
}

export { schema };
