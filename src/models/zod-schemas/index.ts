import { z } from 'zod';

import { standardTimestampInputOverrides, standardTimestampPreprocessOverrides } from '@/common/helpers/drizzle-zod-date';
import { createInsertSchema, createSelectSchema, createUpdateSchema } from '@/lib/drizzle-to-zod-rework';
import { attachments } from '@/models/schema/attachments.schema';
import { ticketMessages } from '@/models/schema/ticket-messages.schema';
import { tickets } from '@/models/schema/tickets.schema';
import { userAddress } from '@/models/schema/user-addresses.schema';
import { user } from '@/models/schema/users.schema';
import { permissions, roles, userSettings } from '../schema';

// === User Address Schemas ===
export const userAddressInsertSchema = createInsertSchema(userAddress, standardTimestampInputOverrides);
export const userAddressSelectSchema = createSelectSchema(userAddress, standardTimestampPreprocessOverrides);
export const userAddressUpdateSchema = createUpdateSchema(userAddress, standardTimestampInputOverrides);

// === User Settings Schemas ===
export const userSettingssInsertSchema = createInsertSchema(userSettings, standardTimestampInputOverrides);
export const userSettingsSelectSchema = createSelectSchema(userSettings, standardTimestampPreprocessOverrides);
export const userSettingsUpdateSchema = createUpdateSchema(userSettings, standardTimestampInputOverrides);

// === Ticket Schemas ===
export const ticketInsertSchema = createInsertSchema(tickets, standardTimestampInputOverrides);
export const ticketSelectSchema = createSelectSchema(tickets, standardTimestampPreprocessOverrides);
export const ticketUpdateSchema = createUpdateSchema(tickets, standardTimestampInputOverrides);

// === Ticket Message schema ===
export const ticketMessageInsertSchema = createInsertSchema(ticketMessages, standardTimestampInputOverrides);
export const ticketMessagesSelectSchema = createSelectSchema(ticketMessages, standardTimestampPreprocessOverrides);
export const ticketStatusUpdateSchema = createUpdateSchema(tickets, standardTimestampInputOverrides);

// === Attachment Schemas ===
export const attachmentInsertSchema = createInsertSchema(attachments, standardTimestampInputOverrides);
export const attachmentSelectSchema = createSelectSchema(attachments, standardTimestampPreprocessOverrides);
export const attachmentUpdateSchema = createUpdateSchema(attachments, standardTimestampInputOverrides);

// === Common Utility Schemas ===
export const uuidSchema = z.uuid('Invalid UUID format');


// === Roles Schemas ===
export const roleInsertSchema = createInsertSchema(roles, standardTimestampInputOverrides);
export const roleSelectSchema = createSelectSchema(roles, standardTimestampPreprocessOverrides);
export const roleUpdateSchema = createUpdateSchema(roles, standardTimestampInputOverrides);

// === User Schemas ===
export const userInsertSchema = createInsertSchema(user, standardTimestampInputOverrides);
export const userSelectSchema = createSelectSchema(user, standardTimestampPreprocessOverrides);
export const userUpdateSchema = createUpdateSchema(user, standardTimestampInputOverrides);

// === Permissions Schemas ===
export const permissionSelectSchema = createSelectSchema(permissions, standardTimestampPreprocessOverrides);

// Public user schema (without sensitive fields)
export const publicUserSelectSchema = userSelectSchema
    .omit({ password: true, verificationToken: true, deletedAt: true })
    .extend({ role: roleSelectSchema });


// === Export Types ===
export type UserInsertInput = z.infer<typeof userInsertSchema>;
export type UserSelectOutput = z.infer<typeof userSelectSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
export type PublicUserOutput = z.infer<typeof publicUserSelectSchema>;

// === User Address Schemas ===
export type UserAddressInsertInput = z.infer<typeof userAddressInsertSchema>;
export type UserAddressSelectOutput = z.infer<typeof userAddressSelectSchema>;
export type UserAddressUpdateInput = z.infer<typeof userAddressUpdateSchema>;

// === User Settings Schemas ===
export type UserSettingsInput = z.infer<typeof userSettingssInsertSchema>;
export type UserSettingsOutput = z.infer<typeof userSettingsSelectSchema>;
export type UserSettingsUpdateInput = z.infer<typeof userSettingsUpdateSchema>;

// === Ticket Schemas ===
export type TicketInsertInput = z.infer<typeof ticketInsertSchema>;
export type TicketSelectOutput = z.infer<typeof ticketSelectSchema>;
export type TicketUpdateInput = z.infer<typeof ticketUpdateSchema>;

// === Ticket Message Schemas ===
export type TicketMessageInput = z.infer<typeof ticketMessageInsertSchema>;
export type TicketMessagesSelectOutput = z.infer<typeof ticketMessagesSelectSchema>;
export type TicketStatusUpdateInput = z.infer<typeof ticketStatusUpdateSchema>;

// === Attachment Schemas ===
export type AttachmentInsertInput = z.infer<typeof attachmentInsertSchema>;
export type AttachmentSelectOutput = z.infer<typeof attachmentSelectSchema>;
export type AttachmentUpdateInput = z.infer<typeof attachmentUpdateSchema>;

// === Role Schemas ===
export type RoleInsertInput = z.infer<typeof roleInsertSchema>;
export type RoleSelectOutput = z.infer<typeof roleSelectSchema>;
export type RoleUpdateInput = z.infer<typeof roleUpdateSchema>;

// === Permission Schemas ===
export type PermissionSelectOutput = z.infer<typeof permissionSelectSchema>;

