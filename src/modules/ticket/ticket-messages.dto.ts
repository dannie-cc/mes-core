import { z } from 'zod';
import { ticketMessageInsertSchema, ticketMessagesSelectSchema, ticketSelectSchema } from '@/models/zod-schemas';
import { MESSAGE_TYPE } from '@/common/enums';
import { createApiResponseDto } from '@/common/helpers/api-response';
import { createStrictZodDto } from '@/common/helpers/zod-strict';
import { MIME_TYPE } from '@/app/services/storage/storage.interface';

export const createTicketMessageSchema = ticketMessageInsertSchema
    .omit({
        id: true,
        createdAt: true,
        updatedAt: true,
        // ticketId and senderId are provided via URL param and auth context respectively
        ticketId: true,
        senderId: true,
    })
    .extend({
        content: z.string().refine((s) => !/[<>]/.test(s), { message: 'Content must not contain HTML tags' }),
        senderId: z.uuid().optional(),
        isInternal: z.boolean().optional().default(false),
        metadata: z
            .string()
            .optional()
            .refine((s) => !/[<>]/.test(s!), { message: 'metadata must not contain HTML tags' }),
        messageType: z.enum(MESSAGE_TYPE),
        attachmentIds: z.array(z.uuid()).optional().default([]),
    });

export const ticketWithMessagesSchema = ticketSelectSchema.extend({
    messages: z.array(
        ticketMessagesSelectSchema.extend({
            sender: z
                .object({
                    id: z.string(),
                    firstName: z.string(),
                    lastName: z.string(),
                    email: z.string(),
                    role: z.object({
                        id: z.string(),
                        name: z.string(),
                    }),
                })
                .nullable(),
            messageAttachments: z.array(
                z.object({
                    id: z.string(),
                    messageId: z.string(),
                    attachmentId: z.string(),
                    attachment: z.object({
                        id: z.string(),
                        fileName: z.string(),
                        mimeType: z.enum(MIME_TYPE),
                    }),
                }),
            ),
        }),
    ),
    user: z
        .object({
            id: z.string(),
            firstName: z.string(),
            lastName: z.string(),
            email: z.string(),
            role: z.object({
                id: z.string(),
                name: z.string(),
            }),
        })
        .nullable(),
});

const updateConsentSchema = z.object({
    email: z.email(),
    action: z.enum(['subscribe', 'unsubscribe']),
});

//Input DTO's
export class CreateTicketMessageDto extends createStrictZodDto(createTicketMessageSchema) { }
export class UpdateConsentDto extends createStrictZodDto(updateConsentSchema) { }

//Response DTO's
export class TicketWithMessagesApiResponseDto extends createApiResponseDto(ticketWithMessagesSchema) { }
