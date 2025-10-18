import { pgTable, serial, varchar, boolean, timestamp } from 'drizzle-orm/pg-core';

export const todos = pgTable('todos', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  done: boolean('done').notNull().default(false),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});
