import { ok } from '@/utils';
import { Controller, Get, Post, Req, Query, Param, Body, ForbiddenException, Put, Header, StreamableFile } from '@nestjs/common';
import { TicketService } from './ticket.service';
import { CreateTicketRequestDto, UpdateTicketStatusDto } from './ticket.dto';
import { TicketDecorators } from './ticket.decorators';
import { CreateTicketMessageDto } from './ticket-messages.dto';
import { PaginatedFilterQueryDto } from '@/common/dto/filter.dto';
import { SENDER_TYPE } from '@/common/enums';
import { Request } from 'express';
import { CurrentUser } from '@/common/decorators/user.decorator';
import { JwtUser } from '@/types/jwt.types';

@Controller('ticket')
export class TicketController {
    constructor(private readonly ticketService: TicketService) { }

    @Post('create')
    @TicketDecorators('create')
    async create(@Req() req: Request, @Body() ticketSubmitRequest: CreateTicketRequestDto) {
        const userId = req?.user?.id ?? null;
        const { consent, ...ticket } = ticketSubmitRequest;
        if (!!userId && !!ticketSubmitRequest.message.senderId && ticketSubmitRequest.message.senderId !== userId) {
            throw new ForbiddenException('Sender ID does not match the authenticated user ID');
        }
        const ipAddress = req.ip;
        ticket.ipAddress = ipAddress; // Attach IP address to the ticket data
        const result = await this.ticketService.create(ticket, req?.user as JwtUser, consent ?? false);
        return ok(result).message('Ticket created successfully');
    }

    @Get('list')
    @TicketDecorators('list')
    async list(@CurrentUser() user: JwtUser, @Query() filterQuery: PaginatedFilterQueryDto) {
        const result = await this.ticketService.list(user, filterQuery);
        return ok(result.data).message('Tickets fetched successfully').paginate({
            total: result.total,
            page: result.page,
            limit: result.limit,
        });
    }

    @Get('my-tickets')
    @TicketDecorators('my-tickets')
    async myTickets(@CurrentUser() user: JwtUser, @Query() filterQuery: PaginatedFilterQueryDto) {
        const result = await this.ticketService.myTickets(user, filterQuery);
        return ok(result.data).message('Tickets fetched successfully').paginate({
            total: result.total,
            page: result.page,
            limit: result.limit,
        });
    }

    @Get(':ticketNumber')
    @TicketDecorators('findOne')
    async findOne(@Param('ticketNumber') ticketNumber: string, @CurrentUser() user: JwtUser) {
        const result = await this.ticketService.getTicketByNumber(ticketNumber, user);
        return ok(result).message('Ticket retrieved successfully');
    }

    @Post(':ticketId/message')
    @TicketDecorators('addMessage')
    async addMessage(@Param('ticketId') ticketId: string, @Body() message: CreateTicketMessageDto, @CurrentUser() user: JwtUser) {
        await this.ticketService.addMessage(ticketId, message, SENDER_TYPE.USER, user);
        return ok(true).message('Message added successfully');
    }

    @Put(':ticketId/status')
    @TicketDecorators('updateTicketStatus')
    async updateTicketStatus(@Param('ticketId') ticketId: string, @Body() body: UpdateTicketStatusDto, @CurrentUser() user: JwtUser) {
        const ticket = await this.ticketService.updateTicketStatus(ticketId, body.status, user, body.note);
        return ok(ticket).message('Ticket status updated successfully');
    }

    @Get(':ticketId/messages')
    @TicketDecorators('getTicketMessages')
    async getTicketMessages(@Param('ticketId') ticketId: string, @CurrentUser() user: JwtUser) {
        const result = await this.ticketService.getTicketWithMessages(ticketId, user);
        return ok(result).message('Ticket messages fetched successfully');
    }

    @Get(':messageAttachmentId/download-url')
    @TicketDecorators('getMessageAttachmentDownloadUrl')
    async getMessageAttachmentDownloadUrl(@Param('messageAttachmentId') messageAttachmentId: string, @CurrentUser() user: JwtUser) {
        const result = await this.ticketService.getMessageAttachmentDownloadUrl(messageAttachmentId, user)
        return ok(result).message('Url retrieved successfully');
    }

    @Get(':messageAttachmentId/thumbnail')
    @TicketDecorators('streamThumbnail')
    @Header('Cache-Control', 'public, max-age=3600')
    async streamThumbnail(@Param('messageAttachmentId') id: string, @CurrentUser() user: JwtUser) {
        const { stream, attachment } = await this.ticketService.getMessageAttachmentThumbnailStream(id, user);

        const result = new StreamableFile(stream, {
            type: attachment.mimeType,
            disposition: 'inline', // don't force "download"
        });

        return ok(result).message('Thumbnail streamed successfully');
    }
}
