import { pgTable, uuid, numeric, timestamp, index, pgEnum } from 'drizzle-orm/pg-core';
import { factory } from './factory.schema';
import { bomRevision } from './bom.schema';

export const workOrderStatusEnum = pgEnum('work_order_status_enum', ['draft', 'released', 'closed', 'canceled']);

export const workOrder = pgTable('work_orders', {
    id: uuid('id').defaultRandom().primaryKey(),
    factoryId: uuid('factory_id')
        .notNull()
        .references(() => factory.id, { onDelete: 'cascade' }),
    bomRevisionId: uuid('bom_revision_id')
        .notNull()
        .references(() => bomRevision.id, { onDelete: 'restrict' }),
    targetQuantity: numeric('target_quantity', { precision: 12, scale: 4 }).notNull(),
    status: workOrderStatusEnum('status').notNull().default('draft'),
    plannedStart: timestamp('planned_start', { withTimezone: true }),
    createdAt: timestamp('_created', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('_updated', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('_deleted', { withTimezone: true }),
}, (table) => [
    index('work_order_factory_idx').on(table.factoryId),
    index('work_order_bom_revision_idx').on(table.bomRevisionId),
    index('work_order_status_idx').on(table.status),
]);
