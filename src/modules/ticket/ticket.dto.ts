import { createZodDto } from 'nestjs-zod';
import { createStrictZodDto } from '@/common/helpers/zod-strict';
import { z } from 'zod';
import { ticketInsertSchema, ticketSelectSchema } from '@/models/zod-schemas';
import { createApiResponseDto, createApiPaginatedResponseDto } from '@/common/helpers/api-response';
import { createTicketMessageSchema } from './ticket-messages.dto';
import { NAME_PATTERN, validateText } from '@/common/helpers/validations';
import { TICKET_STATUS } from '@/common/enums';

const createTicketSchema = ticketInsertSchema
    .omit({
        id: true,
        userId: true, // May be null for anonymous tickets
        status: true, // Default status is set
        ticketNumber: true, // Auto-generated
        createdAt: true,
        updatedAt: true,
        lastMessageAt: true, // Set when messages are added
    })
    .extend({
        orderId: z.uuid().optional(),
        name: validateText({ regex: { pattern: NAME_PATTERN, error: 'Name can only contain alphabets, spaces, apostrophes, or hyphens' }, min: 2, max: 100, isOptional: true }),
        email: z.email('Please enter a valid email address').transform((s) => s?.trim()?.toLowerCase()),
        company: validateText({ isOptional: true }),
        metaData: z.json().optional(),
        ipAddress: z.string().optional(), // Capture IP address if available
        subject: validateText({ min: 5, max: 1000 }),
        message: createTicketMessageSchema, //Will be create ticket_message from it
        recaptchaToken: z.string(),
    });

export const createTicketRequestSchema = createTicketSchema.extend({
    consent: z.boolean().optional(),
});

const ticketWithUserSchema = ticketSelectSchema.extend({
    user: z
        .object({
            id: z.uuid(),
            email: z.email(),
            firstName: z.string().nullable(),
            lastName: z.string().nullable(),
        })
        .nullable(),
});

const updateTicketStatusSchema = z.object({
    status: z.enum(TICKET_STATUS),
    note: z.string().optional(),
});

// Input DTO's
export class CreateTicketDto extends createStrictZodDto(createTicketSchema) {}
export class CreateTicketRequestDto extends createStrictZodDto(createTicketRequestSchema) {}
export class UpdateTicketStatusDto extends createStrictZodDto(updateTicketStatusSchema) {}

//Output DTO's
export class TicketWithUserDto extends createStrictZodDto(ticketWithUserSchema) {}
export class TicketSelectDto extends createZodDto(ticketSelectSchema) {}
export class TicketResponseDto extends createZodDto(ticketSelectSchema) {}

// Response DTOs (class-based for ZodResponse compatibility)
export class TicketApiResponseDto extends createApiResponseDto(ticketSelectSchema) {}
export class TicketPaginatedApiResponseDto extends createApiPaginatedResponseDto(ticketSelectSchema) {}
export class TicketWithUserPaginatedApiResponseDto extends createApiPaginatedResponseDto(ticketWithUserSchema) {}
export class AddMessageApiResponseDto extends createApiResponseDto(z.boolean()) {}
