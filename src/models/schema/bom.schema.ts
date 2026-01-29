import { pgTable, uuid, varchar, numeric, timestamp, index, pgEnum } from 'drizzle-orm/pg-core';
import { DEFAULT_CHAR_LENGTH } from '@/common/constants';
import { product } from './product.schema';

export const bomRevisionStatusEnum = pgEnum('bom_revision_status_enum', ['draft', 'released']);

export const bomRevision = pgTable('bom_revisions', {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id')
        .notNull()
        .references(() => product.id, { onDelete: 'cascade' }),
    code: varchar('code', { length: DEFAULT_CHAR_LENGTH }).notNull(),
    revisionString: varchar('revision_string', { length: 50 }).notNull(),
    status: bomRevisionStatusEnum('status').notNull().default('draft'),
    createdAt: timestamp('_created', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('_updated', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('_deleted', { withTimezone: true }),
}, (table) => [
    index('bom_revision_product_idx').on(table.productId),
    index('bom_revision_status_idx').on(table.status),
]);

export const bomItem = pgTable('bom_items', {
    id: uuid('id').defaultRandom().primaryKey(),
    bomRevisionId: uuid('bom_revision_id')
        .notNull()
        .references(() => bomRevision.id, { onDelete: 'cascade' }),
    materialName: varchar('material_name', { length: DEFAULT_CHAR_LENGTH }).notNull(),
    quantity: numeric('quantity', { precision: 12, scale: 4 }).notNull(),
    unit: varchar('unit', { length: 20 }).notNull(),
    createdAt: timestamp('_created', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('_updated', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('_deleted', { withTimezone: true }),
}, (table) => [
    index('bom_item_revision_idx').on(table.bomRevisionId),
]);
