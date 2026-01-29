import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';

import { CustomLoggerService } from '@/app/services/logger/logger.service';
import { MailService } from '@/app/services/mail/mail.service';
import { StorageService } from '@/app/services/storage/storage.service';
import { PaginatedFilterQueryDto } from '@/common/dto/filter.dto';
import { MESSAGE_TYPE, SENDER_TYPE, TICKET_STATUS, TICKET_TYPE } from '@/common/enums';
import { BaseFilterableService } from '@/common/services/base-filterable.service';
import { FilterService } from '@/common/services/filter.service';
import { RecaptchaService } from '@/common/services/recaptcha.service';
import { DrizzleService } from '@/models/model.service';
import * as Schema from '@/models/schema';
import { AttachmentSelectOutput } from '@/models/zod-schemas';
import { JwtUser } from '@/types/jwt.types';
import { ObjectUtils, RandomStringGenerator } from '@/utils';

import { AttachmentService } from '../attachments/attachment.service';
import { UsersService } from '../users/users.service';
import { CreateTicketMessageDto, UpdateConsentDto } from './ticket-messages.dto';
import { CreateTicketDto, type TicketResponseDto } from './ticket.dto';
import { TicketPolicy } from './ticket.policy';

@Injectable()
export class TicketService extends BaseFilterableService {
    private db;
    private ticketPolicy = new TicketPolicy();

    constructor(
        private readonly drizzle: DrizzleService,
        private readonly userService: UsersService,
        private readonly mailService: MailService,
        private readonly recaptchaService: RecaptchaService,
        filterService: FilterService,
        private readonly logger: CustomLoggerService,
        private readonly attachmentService: AttachmentService,
        private readonly storageService: StorageService,
    ) {
        super(filterService);
        this.logger.setContext(TicketService.name);
        this.db = this.drizzle.database;
    }

    async create(data: CreateTicketDto, user: JwtUser | undefined, subscriptionConsent: boolean, ipAddress?: string): Promise<TicketResponseDto> {
        await this.recaptchaService.verifyToken(data.recaptchaToken, ipAddress);

        if (user) {
            const userExists = await this.userService.findOne(user.id);
            if (!userExists) {
                throw new NotFoundException('User not found');
            }
            if (userExists.email !== data.email) {
                throw new ForbiddenException('Email does not match user email');
            }
        } else {
            throw new ForbiddenException('Guest tickets are no longer supported. Please log in to create a ticket.');
        }
        const userId = user?.id;
        const ticketNumber = RandomStringGenerator.generateTicketNumber();
        const ticketInsertPayload = ObjectUtils.omit(
            {
                ...data,
                ticketNumber,
                userId,
            },
            ['message', 'recaptchaToken'],
        );

        const [ticket] = await this.db
            .insert(Schema.tickets)
            .values(ticketInsertPayload as typeof Schema.tickets.$inferInsert)
            .returning();

        if (!ticket) {
            throw new InternalServerErrorException(`An error occured when creating the ticket.`);
        }
        const consent = subscriptionConsent || false;
        if (consent && userId && data.type === TICKET_TYPE.FEEDBACK) {
            // Save subscription consent
            await this.db
                .insert(Schema.userSettings)
                .values({ userId: userId, consent: subscriptionConsent })
                .onConflictDoUpdate({
                    target: Schema.userSettings.userId,
                    set: { consent: subscriptionConsent, updatedAt: new Date() },
                });
        }
        const message = {
            ...data.message,
            messageType: MESSAGE_TYPE.MESSAGE,
            senderId: user?.id,
        };

        //Add Initial Message
        try {
            await this.db.transaction(async (tx) => {
                const [messageCreated] = await tx
                    .insert(Schema.ticketMessages)
                    .values({ ...message, ticketId: ticket.id, senderType: SENDER_TYPE.USER })
                    .returning();

                await tx.update(Schema.tickets).set({ updatedAt: new Date(), lastMessageAt: new Date() }).where(eq(Schema.tickets.id, ticket.id));
                if (message.attachmentIds && message.attachmentIds.length > 0) {
                    const attachmentLinks = message.attachmentIds.map((attachmentId) => ({
                        messageId: messageCreated.id,
                        attachmentId,
                    }));

                    try {
                        // Rely on FK constraint (message_attachments.attachment_id -> attachments.id)
                        await tx.insert(Schema.messageAttachments).values(attachmentLinks);
                        await this.attachmentService.confirmUpload(message.attachmentIds, tx);
                    } catch (err: any) {
                        const pgCode = err?.cause?.code;

                        if (pgCode === '22P02') {
                            throw new BadRequestException('Invalid UUID format in message_id or attachment_id.');
                        }

                        if (pgCode === '23503') {
                            throw new BadRequestException('One or more attachment IDs do not exist in attachments table.');
                        }
                        throw err;
                    }
                }
            });
        } catch (error) {
            this.logger.error('Error adding message to ticket', error);
            if (error instanceof BadRequestException || error instanceof ForbiddenException || error instanceof NotFoundException) {
                throw error;
            }
            throw new BadRequestException('Error adding message to ticket, use proper inputs and try again');
        }

        if (ticket.createdAt) {
            const emailData = {
                email: data.email,
                name: data.name,
                ticketNumber: ticketNumber,
                status: ticket.status,
            };

            const adminNotificationData = {
                ticketId: ticket.id,
                ticketNumber: ticketNumber,
                ticketType: data.type,
                customerName: data.name || 'Unknown',
                customerEmail: data.email,
                ticketSubject: data.subject,
                createdAt: ticket.createdAt.toISOString(),
            };

            try {
                await this.mailService.sendTicketConfirmation(emailData);
                await this.mailService.sendAdminTicketNotification(adminNotificationData);
            } catch (error) {
                this.logger.error('Failed to send admin notification for ticket', error);
                // Don't throw - admin notification failure shouldn't block ticket creation
            }
        }

        return {
            ...ticket,
            name: ticket.name ?? '',
        };
    }

    async getTicketByNumber(ticketNumber: string, user: JwtUser): Promise<TicketResponseDto> {
        const readWhere = await this.ticketPolicy.read(user);
        const [ticket] = await this.db
            .select()
            .from(Schema.tickets)
            .where(and(eq(Schema.tickets.ticketNumber, ticketNumber), readWhere))
            .execute();

        if (!ticket) {
            throw new NotFoundException('Ticket not found');
        }

        return {
            ...ticket,
            name: ticket.name ?? '',
        };
    }

    async getTicketById(ticketId: string, user: JwtUser): Promise<TicketResponseDto> {
        const readWhere = await this.ticketPolicy.read(user);
        const [ticket] = await this.db
            .select()
            .from(Schema.tickets)
            .where(and(eq(Schema.tickets.id, ticketId), readWhere))
            .execute();

        if (!ticket) {
            throw new NotFoundException('Ticket not found');
        }

        return {
            ...ticket,
            name: ticket.name ?? '',
        };
    }

    async list(user: JwtUser, query: PaginatedFilterQueryDto) {
        const policyWhere = await this.ticketPolicy.read(user);

        const result = await this.filterable(this.db, Schema.tickets, {
            defaultSortColumn: 'createdAt',
        })
            .where(policyWhere)
            .filter(query)
            .orderByFromQuery(query, 'createdAt')
            .paginate(query)
            .select();

        return result;
    }

    async myTickets(user: JwtUser, query: PaginatedFilterQueryDto) {
        const result = await this.filterable(this.db, Schema.tickets, {
            defaultSortColumn: 'createdAt',
        })
            .where(eq(Schema.tickets.userId, user.id))
            .filter(query)
            .join(Schema.user, eq(Schema.tickets.userId, Schema.user.id), 'inner')
            .orderByFromQuery(query, 'createdAt')
            .paginate(query)
            .select();

        return result;
    }

    async addMessage(ticketId: string, message: CreateTicketMessageDto, senderType: SENDER_TYPE = SENDER_TYPE.USER, user: JwtUser): Promise<void> {
        const ticket = await this.getTicketById(ticketId, user);
        await this.ticketPolicy.canAddMessage(ticket, user, message?.isInternal);

        const userId = user.id;
        message.senderId = userId;

        const shouldReopenTicket = senderType === SENDER_TYPE.USER && (ticket.status === TICKET_STATUS.RESOLVED || ticket.status === TICKET_STATUS.CLOSED);

        try {
            await this.db.transaction(async (tx) => {
                const [messageCreated] = await tx
                    .insert(Schema.ticketMessages)
                    .values({ ...message, ticketId: ticketId, senderType })
                    .returning();

                const ticketUpdate: { updatedAt: Date; lastMessageAt: Date; status?: TICKET_STATUS } = {
                    updatedAt: new Date(),
                    lastMessageAt: new Date(),
                };

                if (shouldReopenTicket) {
                    ticketUpdate.status = TICKET_STATUS.OPEN;
                }

                await tx.update(Schema.tickets).set(ticketUpdate).where(eq(Schema.tickets.id, ticketId));
                if (message.attachmentIds && message.attachmentIds.length > 0) {
                    const attachmentLinks = message.attachmentIds.map((attachmentId) => ({
                        messageId: messageCreated.id,
                        attachmentId,
                    }));
                    try {
                        // Rely on FK constraint (message_attachments.attachment_id -> attachments.id)
                        await tx.insert(Schema.messageAttachments).values(attachmentLinks);
                        await this.attachmentService.confirmUpload(message.attachmentIds, tx);
                    } catch (err: any) {
                        const pgCode = err?.cause?.code;

                        if (pgCode === '22P02') {
                            throw new BadRequestException('Invalid UUID format in message_id or attachment_id.');
                        }

                        if (pgCode === '23503') {
                            throw new BadRequestException('One or more attachment IDs do not exist in attachments table.');
                        }
                        throw err;
                    }
                }
            });
        } catch (error) {
            this.logger.error('Error adding message to ticket', error);
            if (error instanceof BadRequestException || error instanceof ForbiddenException || error instanceof NotFoundException) {
                throw error;
            }
            throw new BadRequestException('Error adding message to ticket, use proper inputs and try again');
        }
        return;
    }

    async getTicketWithMessages(ticketId: string, user: JwtUser) {
        const ticketReadWhere = await this.ticketPolicy.read(user);
        const messageReadWhere = await this.ticketPolicy.readInternalMessage(user);
        if (!ticketId) {
            throw new BadRequestException('Ticket ID is required');
        }
        const ticket = await this.db.query.tickets.findFirst({
            where: and(eq(Schema.tickets.id, ticketId), ticketReadWhere),
            with: {
                messages: {
                    where: messageReadWhere,
                    orderBy: [asc(Schema.ticketMessages.createdAt)],
                    columns: { id: true, ticketId: true, senderId: true, content: true, createdAt: true, senderType: true, isInternal: true, messageType: true, metadata: true },
                    with: {
                        sender: {
                            columns: { id: true, firstName: true, lastName: true, email: true },
                            with: {
                                role: {
                                    columns: {
                                        id: true,
                                        name: true,
                                    },
                                },
                            },
                        },
                        messageAttachments: {
                            columns: { id: true, messageId: true, attachmentId: true },
                            with: {
                                attachment: {
                                    columns: {
                                        id: true,
                                        fileName: true,
                                        mimeType: true,
                                    },
                                },
                            },
                        },
                    },
                },
                user: {
                    columns: { id: true, firstName: true, lastName: true, email: true, roleId: true },
                    with: {
                        role: {
                            columns: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
            },
        });

        if (!ticket) {
            throw new NotFoundException('No ticket details found for the given ticket number');
        }

        return {
            ...ticket,
            name: ticket.name ?? '',
        };
    }

    // Update ticket status with system message
    async updateTicketStatus(ticketId: string, newStatus: TICKET_STATUS, updatedBy: JwtUser, note?: string) {
        const policyWhere = await this.ticketPolicy.updateStatus(updatedBy, eq(Schema.tickets.id, ticketId));
        if (!ticketId || !newStatus) {
            throw new BadRequestException('Ticket ID and new status are required');
        }

        // Update ticket status and optionally add internal note in a transaction
        const ticket = await this.db.transaction(async (tx) => {
            const [updatedTicket] = await tx.update(Schema.tickets).set({ status: newStatus, updatedAt: new Date() }).where(policyWhere).returning();

            if (!updatedTicket) {
                throw new NotFoundException("No ticket found or you don't have permission to update it.");
            }

            // If note is provided, create an internal message
            if (note && note.trim()) {
                await tx.insert(Schema.ticketMessages).values({
                    ticketId: updatedTicket.id,
                    senderId: updatedBy.id,
                    content: note,
                    senderType: SENDER_TYPE.ADMIN,
                    isInternal: true,
                    messageType: MESSAGE_TYPE.NOTE,
                });

                // Update lastMessageAt
                await tx.update(Schema.tickets).set({ lastMessageAt: new Date() }).where(eq(Schema.tickets.id, updatedTicket.id));
            }

            return updatedTicket;
        });

        return ticket;
    }

    async updateConsent(queryInput: UpdateConsentDto) {
        if (!queryInput.email || !queryInput.action) {
            throw new BadRequestException('Email and action are required');
        }
        const consent = queryInput.action === 'subscribe' ? true : false;
        const user = await this.userService.findByEmail(queryInput.email);
        if (user) {
            // Update consent in userSettings table
            const [user_settings] = await this.db
                .insert(Schema.userSettings)
                .values({ userId: user.id, consent: consent })
                .onConflictDoUpdate({
                    target: Schema.userSettings.userId,
                    set: { consent: consent, updatedAt: new Date() },
                })
                .returning();
            return user_settings;
        } else {
            throw new NotFoundException('User not found. Consent update is only available for registered users.');
        }
    }

    async getMessageAttachmentDownloadUrl(messageAttachmentId: string, user: JwtUser): Promise<{ url: string; attachment: AttachmentSelectOutput }> {
        const messageAttachment = await this.db.query.messageAttachments.findFirst({
            where: eq(Schema.messageAttachments.id, messageAttachmentId),
            with: {
                attachment: true,
                message: {
                    with: {
                        ticket: true,
                    },
                },
            },
        });

        if (!messageAttachment) {
            throw new NotFoundException(`Message Attachment cannot be found for id: ${messageAttachmentId}`);
        }

        if (!messageAttachment.message?.senderId) {
            //We are not letting unauthenticated users to add attachments. So this is bad request.
            throw new BadRequestException(`Message Attachment cannot be found for id: ${messageAttachmentId}`);
        }

        await this.ticketPolicy.canReadMessageAttachment(messageAttachment.message.ticket, user, messageAttachment.message.isInternal ?? undefined);

        const objectName = this.attachmentService.getObjectPath(messageAttachment.message.senderId, messageAttachment.attachmentId, messageAttachment.attachment.fileName);
        const url = await this.storageService.presignedGetObject(objectName);

        return {
            url,
            attachment: messageAttachment.attachment,
        };
    }

    async getMessageAttachmentThumbnailStream(messageAttachmentId: string, user: JwtUser) {
        const messageAttachment = await this.db.query.messageAttachments.findFirst({
            where: eq(Schema.messageAttachments.id, messageAttachmentId),
            with: {
                attachment: true,
                message: {
                    with: {
                        ticket: true,
                    },
                },
            },
        });

        if (!messageAttachment) {
            throw new NotFoundException(`Message Attachment cannot be found for id: ${messageAttachmentId}`);
        }

        if (!messageAttachment.message?.senderId) {
            //We are not letting unauthenticated users to add attachments. So this is bad request.
            throw new BadRequestException(`Message Attachment cannot be found for id: ${messageAttachmentId}`);
        }

        if (!messageAttachment.attachment.mimeType.startsWith('image/')) {
            throw new NotFoundException();
        }

        await this.ticketPolicy.canReadMessageAttachment(messageAttachment.message.ticket, user, messageAttachment.message.isInternal ?? undefined);

        const objectName = this.attachmentService.getObjectPath(messageAttachment.message.senderId, messageAttachment.attachmentId, messageAttachment.attachment.fileName);

        const stream = await this.storageService.getObjectStream(objectName);

        return {
            stream,
            attachment: messageAttachment.attachment,
        };
    }
}
