import { pgTable, uuid, boolean, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { user } from './users.schema';

export const userSettings = pgTable(
    'user_settings',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        userId: uuid('user_id')
            .notNull()
            .references(() => user.id),
        consent: boolean('consent').default(false).notNull(),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
        deletedAt: timestamp('deleted_at', { withTimezone: true }),
    },
    (table) => [index('user_settings_user_idx').on(table.userId), uniqueIndex('user_settings_user_unique_idx').on(table.userId)],
);
