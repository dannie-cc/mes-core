import { DEFAULT_CHAR_LENGTH } from '@/common/constants';
import { boolean, index, pgTable, primaryKey, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { permissions as permissionsSchema } from './permissions.schema';

export const roles = pgTable(
    'roles',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        name: varchar('name', { length: DEFAULT_CHAR_LENGTH }).notNull().unique(),
        description: varchar('description', { length: DEFAULT_CHAR_LENGTH }),
        isDefault: boolean('is_default').default(false),
        isAdmin: boolean('is_admin').default(false),
        createdAt: timestamp('_created', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('_updated', { withTimezone: true }).notNull().defaultNow(),
        deletedAt: timestamp('_deleted', { withTimezone: true }),
    },
    (table) => {
        return [
            // Indexes
            index('role_name_idx').on(table.name),
            index('role_date_idx').on(table.createdAt),
        ];
    },
);

export const rolePermissions = pgTable(
    'role_permissions',
    {
        roleId: uuid('role_id')
            .notNull()
            .references(() => roles.id, { onDelete: 'cascade' }),

        permissionId: uuid('permission_id')
            .notNull()
            .references(() => permissionsSchema.id, { onDelete: 'cascade' }),
    },
    (table) => [index('rp_role_idx').on(table.roleId), index('rp_permission_idx').on(table.permissionId), primaryKey({ columns: [table.roleId, table.permissionId] })],
);
