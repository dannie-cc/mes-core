import { DEFAULT_CHAR_LENGTH } from '@/common/constants';
import { relations } from 'drizzle-orm';
import { index, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { rolePermissions as rolePermissionSchema } from './roles.schema';

export const permissions = pgTable(
    'permissions',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        name: varchar('name', { length: DEFAULT_CHAR_LENGTH }).notNull().unique(),
        description: varchar('description', { length: DEFAULT_CHAR_LENGTH }).notNull(),
        createdAt: timestamp('_created', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('_updated', { withTimezone: true }).notNull().defaultNow(),
        deletedAt: timestamp('_deleted', { withTimezone: true }),
    },
    (table) => {
        return [
            // Indexes
            index('permission_name_idx').on(table.name),
            index('permission_date_idx').on(table.createdAt),
        ];
    },
);

export const permissionsRelations = relations(permissions, ({ many }) => ({
    rolePermissions: many(rolePermissionSchema),
}));
