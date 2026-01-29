import { sql } from 'drizzle-orm';
import { pgTable, uuid, varchar, boolean, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';

import { user } from './users.schema';
import { DEFAULT_CHAR_LENGTH } from '@/common/constants';

export const userAddress = pgTable(
    'user_addresses',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        userId: uuid('user_id')
            .notNull()
            .references(() => user.id),
        label: varchar('label', { length: DEFAULT_CHAR_LENGTH }).notNull(),
        fullName: varchar('full_name', { length: DEFAULT_CHAR_LENGTH }).notNull(),
        phone: varchar('phone', { length: DEFAULT_CHAR_LENGTH }),
        company: varchar('company', { length: DEFAULT_CHAR_LENGTH }),
        line1: varchar('line1', { length: DEFAULT_CHAR_LENGTH }).notNull(),
        line2: varchar('line2', { length: DEFAULT_CHAR_LENGTH }),
        city: varchar('city', { length: DEFAULT_CHAR_LENGTH }).notNull(),
        state: varchar('state', { length: DEFAULT_CHAR_LENGTH }),
        postalCode: varchar('postal_code', { length: DEFAULT_CHAR_LENGTH }).notNull(),
        countryCode: varchar('country_code', { length: 2 }).notNull(),
        isDefault: boolean('is_default').default(false).notNull(),
        createdAt: timestamp('_created', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('_updated', { withTimezone: true }).notNull().defaultNow(),
        deletedAt: timestamp('_deleted', { withTimezone: true }),
    },
    (table) => [
        index('user_address_user_idx').on(table.userId),
        index('user_address_default_idx').on(table.userId, table.isDefault),
        uniqueIndex('user_default_address_unique')
            .on(table.userId)
            .where(sql`is_default IS TRUE`),
    ],
);
