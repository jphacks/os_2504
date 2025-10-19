import 'dotenv/config';
import { beforeAll, afterAll } from 'vitest';

let cleanupPool: (() => Promise<void>) | null = null;

beforeAll(async () => {
  const fallback = 'postgresql://postgres:postgres@localhost:5432/app?sslmode=disable';
  const raw = process.env.DATABASE_URL ?? fallback;
  const url = new URL(raw);
  if (url.hostname === 'db') {
    url.hostname = '127.0.0.1';
  }
  process.env.DATABASE_URL = url.toString();

  const { pool } = await import('../../../server/db/client.js');
  const client = await pool.connect();
  client.release();
  cleanupPool = async () => {
    await pool.end();
  };
}, 30000);

afterAll(async () => {
  if (cleanupPool) {
    await cleanupPool();
  }
});
