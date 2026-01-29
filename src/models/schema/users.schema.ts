import { pgTable, uuid, varchar, timestamp, boolean, index, uniqueIndex } from 'drizzle-orm/pg-core';

import { DEFAULT_CHAR_LENGTH } from '@/common/constants';
import { sql } from 'drizzle-orm';
import { roles as roleSchema } from './roles.schema';
import { factory } from './factory.schema';

export const user = pgTable(
    'users',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        email: varchar('email', { length: DEFAULT_CHAR_LENGTH }).notNull(),
        password: varchar('password', { length: DEFAULT_CHAR_LENGTH }).notNull(),
        firstName: varchar('first_name', { length: DEFAULT_CHAR_LENGTH }).notNull(),
        lastName: varchar('last_name', { length: DEFAULT_CHAR_LENGTH }).notNull(),
        isVerified: boolean('is_verified').default(false),
        verificationToken: varchar('verification_token', { length: DEFAULT_CHAR_LENGTH }),
        createdAt: timestamp('_created', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('_updated', { withTimezone: true }).notNull().defaultNow(),
        deletedAt: timestamp('_deleted', { withTimezone: true }),
        roleId: uuid('role_id')
            .notNull()
            .references(() => roleSchema.id, { onDelete: 'restrict' }),
        factoryId: uuid('factory_id')
            .references(() => factory.id, { onDelete: 'set null' }),
    },
    (table) => [
        // Indexes
        index('user_email_idx').on(table.email),
        index('user_first_name_idx').on(table.firstName),
        index('user_last_name_idx').on(table.lastName),
        index('user_role_idx').on(table.roleId),
        index('user_factory_idx').on(table.factoryId),
        uniqueIndex("users_email_lower_idx")
            .on(sql`lower(${table.email})`)
    ],
);
