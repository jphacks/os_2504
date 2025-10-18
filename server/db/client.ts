import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const connectionString =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/app?sslmode=disable';

const useSSL = process.env.DB_SSL === 'true';
const sslConfig = useSSL
  ? {
      rejectUnauthorized: process.env.DB_SSL_STRICT === 'true',
    }
  : undefined;

export const pool = new Pool({
  connectionString,
  ssl: sslConfig,
  max: process.env.DB_MAX_CONNECTIONS ? Number(process.env.DB_MAX_CONNECTIONS) : undefined,
});

export const db = drizzle(pool);
