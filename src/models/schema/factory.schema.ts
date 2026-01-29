import { pgTable, uuid, varchar, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { DEFAULT_CHAR_LENGTH } from '@/common/constants';

export const factory = pgTable('factories', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: DEFAULT_CHAR_LENGTH }).notNull(),
    timezone: varchar('timezone', { length: 50 }).notNull().default('UTC'),
    settings: jsonb('settings').default({}),
    createdAt: timestamp('_created', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('_updated', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('_deleted', { withTimezone: true }),
});
