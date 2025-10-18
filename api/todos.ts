import { desc, eq } from 'drizzle-orm';
import { db, schema, ensureDatabase } from '../db/index.js';

export async function GET() {
  await ensureDatabase();
  const todos = await db
    .select()
    .from(schema.todos)
    .orderBy(desc(schema.todos.created_at));

  return new Response(JSON.stringify({ todos }), {
    headers: { 'content-type': 'application/json' }
  });
}

export async function POST(request: Request) {
  await ensureDatabase();

  const payload = await request.json().catch(() => ({}));
  const title = typeof payload.title === 'string' ? payload.title.trim() : '';

  if (!title) {
    return new Response(JSON.stringify({ error: 'title required' }), {
      status: 400,
      headers: { 'content-type': 'application/json' }
    });
  }

  const [inserted] = await db
    .insert(schema.todos)
    .values({ title })
    .returning();

  return new Response(JSON.stringify({ todo: inserted }), {
    status: 201,
    headers: { 'content-type': 'application/json' }
  });
}

export async function PATCH(request: Request) {
  await ensureDatabase();

  const payload = await request.json().catch(() => ({}));
  const id = Number(payload.id);
  const done = payload.done === true;

  if (!Number.isInteger(id)) {
    return new Response(JSON.stringify({ error: 'valid id required' }), {
      status: 400,
      headers: { 'content-type': 'application/json' }
    });
  }

  const [updated] = await db
    .update(schema.todos)
    .set({ done })
    .where(eq(schema.todos.id, id))
    .returning();

  if (!updated) {
    return new Response(JSON.stringify({ error: 'todo not found' }), {
      status: 404,
      headers: { 'content-type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ todo: updated }), {
    headers: { 'content-type': 'application/json' }
  });
}
