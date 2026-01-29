import { pgTable, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { DEFAULT_CHAR_LENGTH } from '@/common/constants';
import { factory } from './factory.schema';

export const product = pgTable('products', {
    id: uuid('id').defaultRandom().primaryKey(),
    factoryId: uuid('factory_id')
        .notNull()
        .references(() => factory.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: DEFAULT_CHAR_LENGTH }).notNull(),
    sku: varchar('sku', { length: DEFAULT_CHAR_LENGTH }).notNull(),
    createdAt: timestamp('_created', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('_updated', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('_deleted', { withTimezone: true }),
}, (table) => [
    index('product_factory_idx').on(table.factoryId),
    index('product_sku_idx').on(table.sku),
]);
