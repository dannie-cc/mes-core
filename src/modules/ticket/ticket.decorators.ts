import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import { ZodResponse } from 'nestjs-zod';

import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddMessageApiResponseDto, TicketApiResponseDto, TicketPaginatedApiResponseDto } from './ticket.dto';
import { ErrorResponseDto } from '@/common/dto/error.dto';
import { RateLimitGuard } from '../auth/guards/rate-limit.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequiresPermissions } from '../auth/decorators/permission.decorator';
import { Permissions } from '@/common/permissions';
import { TicketWithMessagesApiResponseDto } from './ticket-messages.dto';
import { DownloadAttachmentApiResponseDto } from '../attachments/attachment.dto';

const ticketEndpointConfig = {
    create: () =>
        applyDecorators(
            UseGuards(OptionalJwtAuthGuard),
            UseGuards(RateLimitGuard),
            ApiOperation({ summary: 'Save user request', description: 'Save the customer request as a ticket' }),
            ZodResponse({ status: 200, type: TicketApiResponseDto, description: 'Ticket created successfully' }),
        ),
    findOne: () =>
        applyDecorators(
            UseGuards(JwtAuthGuard, PermissionGuard),
            RequiresPermissions(Permissions.tickets.Read),
            ApiOperation({ summary: 'Get a ticket by ticket number', description: 'Fetch a specific ticket by its ticket number' }),
            ZodResponse({ status: 200, type: TicketApiResponseDto, description: 'Ticket fetched successfully' }),
            ApiResponse({ status: 404, description: 'Ticket not found', type: ErrorResponseDto }),
            ApiResponse({ status: 401, description: 'Unauthorized', type: ErrorResponseDto }),
            ApiResponse({ status: 403, description: 'Forbidden', type: ErrorResponseDto }),
        ),
    list: () =>
        applyDecorators(
            UseGuards(JwtAuthGuard, PermissionGuard),
            RequiresPermissions(Permissions.tickets.Read),
            ApiOperation({
                summary: 'Get all tickets ',
            }),
            ZodResponse({ status: 200, type: TicketPaginatedApiResponseDto, description: 'Tickets fetched successfully' }),
            ApiResponse({ status: 401, description: 'Unauthorized', type: ErrorResponseDto }),
            ApiResponse({ status: 403, description: 'Forbidden', type: ErrorResponseDto }),
        ),
    'my-tickets': () =>
        applyDecorators(
            UseGuards(JwtAuthGuard, PermissionGuard),
            RequiresPermissions(Permissions.tickets.Read),
            ApiOperation({
                summary: 'Get tickets for the logged-in user',
                description: 'Fetch all tickets created by the logged-in user with filtering, sorting and pagination support',
            }),
            ZodResponse({ status: 200, type: TicketPaginatedApiResponseDto, description: 'Tickets fetched successfully' }),
            ApiResponse({ status: 401, description: 'Unauthorized', type: ErrorResponseDto }),
            ApiResponse({ status: 403, description: 'Forbidden', type: ErrorResponseDto }),
        ),
    getTicketMessages: () =>
        applyDecorators(
            UseGuards(JwtAuthGuard, PermissionGuard),
            RequiresPermissions(Permissions.tickets.Read),
            ApiOperation({
                summary: 'Get all messages of the ticket for the logged-in user',
                description: 'Fetch all tickets with filtering, sorting and pagination support',
            }),
            ZodResponse({ status: 200, type: TicketWithMessagesApiResponseDto, description: 'Tickets-messages fetched successfully' }),
            ApiResponse({ status: 401, description: 'Unauthorized', type: ErrorResponseDto }),
            ApiResponse({ status: 403, description: 'Forbidden', type: ErrorResponseDto }),
        ),
    addMessage: () =>
        applyDecorators(
            UseGuards(JwtAuthGuard, PermissionGuard),
            RequiresPermissions(Permissions.tickets.AddMessage),
            ApiOperation({
                summary: 'Adding new message to a ticket',
                description: 'Add a new messages for the existing ticket',
            }),
            ZodResponse({ status: 200, type: AddMessageApiResponseDto, description: 'Tickets-message created successfully' }),
            ApiResponse({ status: 401, description: 'Unauthorized', type: ErrorResponseDto }),
            ApiResponse({ status: 403, description: 'Forbidden', type: ErrorResponseDto }),
        ),
    updateTicketStatus: () =>
        applyDecorators(
            UseGuards(JwtAuthGuard, PermissionGuard),
            RequiresPermissions(Permissions.tickets.UpdateStatus),
            ApiOperation({
                summary: 'Update the status of the given ticket',
                description: 'Updating status of a ticket in the system',
            }),
            ZodResponse({ status: 200, type: TicketApiResponseDto, description: 'Tickets status updated successfully' }),
            ApiResponse({ status: 401, description: 'Unauthorized', type: ErrorResponseDto }),
            ApiResponse({ status: 403, description: 'Forbidden', type: ErrorResponseDto }),
        ),
    getMessageAttachmentDownloadUrl: () =>
        applyDecorators(
            UseGuards(JwtAuthGuard, PermissionGuard),
            RequiresPermissions(Permissions.tickets.Read),
            ApiOperation({
                summary: 'Get download url of a message attachment',
            }),
            ZodResponse({ status: 200, type: DownloadAttachmentApiResponseDto, description: 'Url retrieved successfully' }),
            ApiResponse({ status: 401, description: 'Unauthorized', type: ErrorResponseDto }),
            ApiResponse({ status: 403, description: 'Forbidden', type: ErrorResponseDto }),
        ),
    streamThumbnail: () =>
        applyDecorators(
            UseGuards(JwtAuthGuard, PermissionGuard),
            RequiresPermissions(Permissions.tickets.Read),
            ApiOperation({ summary: 'Stream thumbnail for image attachments' }),
            ApiResponse({ status: 403, description: 'Forbidden - Admin access required', type: ErrorResponseDto }),
        ),
} as const;

export type TicketEndpointKey = keyof typeof ticketEndpointConfig;

export function TicketDecorators(endpoint: TicketEndpointKey) {
    return ticketEndpointConfig[endpoint]();
}
