import { sql } from 'drizzle-orm';
import { pgTable, serial, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const userTable = pgTable('user', {
  id: uuid('id')
    .default(sql`gen_random_uuid()`)
    .primaryKey(),
  firstName: varchar('first_name').notNull(),
  lastName: varchar('last_name').notNull(),
  email: varchar('email').notNull(),
  password: text('password').notNull(),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'date',
  })
    .defaultNow()
    .notNull(),
});

export const sessionTable = pgTable('session', {
  id: text('id').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => userTable.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', {
    withTimezone: true,
    mode: 'date',
  }).notNull(),
});
