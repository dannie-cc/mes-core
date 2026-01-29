import { sql } from 'drizzle-orm';
import { pgTable, uuid, varchar, timestamp, integer, boolean, index, check } from 'drizzle-orm/pg-core';

import { user } from './users.schema';
import { DEFAULT_CHAR_LENGTH } from '@/common/constants';
import { attachmentType } from './common';

export const attachments = pgTable(
    'attachments',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        userId: uuid('user_id')
            .notNull()
            .references(() => user.id),
        type: attachmentType('type').notNull(),
        fileName: varchar('file_name', { length: DEFAULT_CHAR_LENGTH }).notNull(),
        mimeType: varchar('mime_type', { length: 100 }).notNull(),
        size: integer('filesize'),
        isUploaded: boolean('is_uploaded').notNull().default(false),
        expiresAt: timestamp('expires_at', { withTimezone: true }),
        createdAt: timestamp('_created', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('_updated', { withTimezone: true }).notNull().defaultNow(),
        deletedAt: timestamp('_deleted', { withTimezone: true }),
    },
    (table) => {
        return [
            // Indexes
            index('attachment_user_idx').on(table.userId),
            index('attachment_type_idx').on(table.type),
            index('attachment_date_idx').on(table.createdAt),
            index('attachment_user_date_idx').on(table.userId, table.createdAt),
            index('attachment_user_type_idx').on(table.userId, table.type),

            // Constraints
            check('attachment_size_positive', sql`${table.size} > 0`),
        ];
    },
);
