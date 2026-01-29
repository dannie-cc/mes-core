import { ticketMessages } from './ticket-messages.schema';
import { relations } from 'drizzle-orm';
import { pgTable, uuid, varchar, timestamp, pgEnum, inet } from 'drizzle-orm/pg-core';

import { user } from './users.schema';
import { DEFAULT_CHAR_LENGTH } from '@/common/constants';
import { TICKET_TYPE, TICKET_STATUS } from '@/common/enums';

export const ticketTypeEnum = pgEnum('ticket_type_enum', [...(Object.values(TICKET_TYPE) as [TICKET_TYPE, ...TICKET_TYPE[]])]);

export const ticketStatusEnum = pgEnum('ticket_status_enum', [...(Object.values(TICKET_STATUS) as [TICKET_STATUS, ...TICKET_STATUS[]])]);

export const tickets = pgTable('tickets', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => user.id, { onDelete: 'set null' }),
    name: varchar('name', { length: 100 }),
    email: varchar('email', { length: DEFAULT_CHAR_LENGTH }).notNull(),
    phone: varchar('phone', { length: 20 }),
    company: varchar('company', { length: 100 }),
    type: ticketTypeEnum('type').notNull(),
    subject: varchar('subject', { length: 2000 }).notNull(),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
    ipAddress: inet('ip_address'),
    status: ticketStatusEnum('status').notNull().default(TICKET_STATUS.OPEN),
    ticketNumber: varchar('ticket_number', { length: 20 }).notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
    user: one(user, {
        fields: [tickets.userId],
        references: [user.id],
    }),
    messages: many(ticketMessages),
}));
