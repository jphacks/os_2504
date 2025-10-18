import { Router } from 'express';
import { desc, eq } from 'drizzle-orm';
import { db, schema, ensureDatabase } from '../../db/index.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    await ensureDatabase();
    const todos = await db
      .select()
      .from(schema.todos)
      .orderBy(desc(schema.todos.created_at));

    res.json({ todos });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    await ensureDatabase();

    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    if (!title) {
      res.status(400).json({ error: 'title required' });
      return;
    }

    const [inserted] = await db
      .insert(schema.todos)
      .values({ title })
      .returning();

    res.status(201).json({ todo: inserted });
  } catch (error) {
    next(error);
  }
});

router.patch('/', async (req, res, next) => {
  try {
    await ensureDatabase();

    const id = Number(req.body?.id);
    const done = req.body?.done === true;

    if (!Number.isInteger(id)) {
      res.status(400).json({ error: 'valid id required' });
      return;
    }

    const [updated] = await db
      .update(schema.todos)
      .set({ done })
      .where(eq(schema.todos.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: 'todo not found' });
      return;
    }

    res.json({ todo: updated });
  } catch (error) {
    next(error);
  }
});

export default router;
