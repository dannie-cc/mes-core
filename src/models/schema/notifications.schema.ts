import { pgTable, uuid, varchar, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { user } from './users.schema';
import { DEFAULT_CHAR_LENGTH } from '@/common/constants';

export const notifications = pgTable('notifications', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
        .notNull()
        .references(() => user.id),
    type: varchar('type', { length: 50 }).notNull(), // system, order_status (NOTIFICATION_TYPE)
    way: varchar('way', { length: 50 }).notNull(), // email, sms, push (NOTIFICATION_WAY)
    status: varchar('status', { length: 50 }).notNull(), // read, unread (NOTIFICATION_STATUS)
    subject: varchar('subject', { length: DEFAULT_CHAR_LENGTH }).notNull(),
    description: varchar('description', { length: 1000 }).notNull(),
    readAt: timestamp('read_at', { withTimezone: true }),
    data: jsonb('data'), // Additional notification data
    createdAt: timestamp('_created', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('_updated', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('_deleted', { withTimezone: true }),
});
