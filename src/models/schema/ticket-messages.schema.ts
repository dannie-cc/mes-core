import { boolean, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { tickets } from './tickets.schema';
import { relations } from 'drizzle-orm';
import { user } from './users.schema';
import { MESSAGE_TYPE, SENDER_TYPE } from '@/common/enums';
import { attachments } from './attachments.schema';

export const senderTypeEnum = pgEnum('sender_type_enum', [...(Object.values(SENDER_TYPE) as [SENDER_TYPE, ...SENDER_TYPE[]])]);
export const messageTypeEnum = pgEnum('message_type_enum', [...(Object.values(MESSAGE_TYPE) as [MESSAGE_TYPE, ...MESSAGE_TYPE[]])]);

export const ticketMessages = pgTable('ticket_messages', {
    id: uuid('id').defaultRandom().primaryKey(),
    ticketId: uuid('ticket_id')
        .notNull()
        .references(() => tickets.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    senderId: uuid('sender_id').references(() => user.id, { onDelete: 'set null' }),
    senderType: senderTypeEnum('sender_type').default(SENDER_TYPE.USER), // Default to USER
    isInternal: boolean('is_internal').default(false), // Admin-only notes
    metadata: jsonb('metadata'),
    messageType: messageTypeEnum('message_type').default(MESSAGE_TYPE.MESSAGE), // Default to MESSAGE
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Junction table for message attachments (using existing attachments table)

export const messageAttachments = pgTable('message_attachments', {
    id: uuid('id').defaultRandom().primaryKey(),
    messageId: uuid('message_id')
        .references(() => ticketMessages.id, { onDelete: 'cascade' })
        .notNull(),
    attachmentId: uuid('attachment_id')
        .references(() => attachments.id, { onDelete: 'cascade' })
        .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const messageAttachmentsRelations = relations(messageAttachments, ({ one }) => ({
    message: one(ticketMessages, {
        fields: [messageAttachments.messageId],
        references: [ticketMessages.id],
    }),
    attachment: one(attachments, {
        fields: [messageAttachments.attachmentId],
        references: [attachments.id],
    }),
}));

export const ticketMessagesRelations = relations(ticketMessages, ({ one, many }) => ({
    ticket: one(tickets, { fields: [ticketMessages.ticketId], references: [tickets.id] }),
    sender: one(user, { fields: [ticketMessages.senderId], references: [user.id] }),
    messageAttachments: many(messageAttachments), // Only link junction table
}));
