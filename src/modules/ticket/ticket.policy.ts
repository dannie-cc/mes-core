import { andAll, BasePolicy, TRUE } from '@/common/base.policy';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { tickets as ticketSchema } from '@/models/schema/tickets.schema';
import { eq, SQL } from 'drizzle-orm';
import { JwtUser } from '@/types/jwt.types';
import { TicketSelectDto } from './ticket.dto';
import { ticketMessages } from '@/models/schema';

@Injectable()
export class TicketPolicy extends BasePolicy<typeof ticketSchema> {
    constructor() {
        super({
            table: ticketSchema,
            resource: 'tickets',
            owner: (t) => t.userId,
        });
    }


    async readInternalMessage(user: JwtUser): Promise<SQL> {
        if (this.hasAll(user, 'read')) {
            return TRUE;
        } else {
            return eq(ticketMessages.isInternal, false);
        }
    }

    async updateStatus(user: JwtUser, ...extra: SQL[]): Promise<SQL> {
        let base: SQL | null = null;
        if (this.hasAll(user, 'update_status')) base = TRUE;
        else if (this.hasBase(user, 'update_status')) base = eq(this.owner(this.table), user.id);

        if (!base) {
            throw new ForbiddenException(`Cannot update ${this.resource}`);
        }

        return andAll(base, ...extra);
    }

    async canAddMessage(ticket: TicketSelectDto, user: JwtUser, isInternal?: boolean): Promise<void> {
        const isOwner = ticket.userId === user.id;

        if (isInternal && !this.hasAll(user, 'add_message')) {
            throw new ForbiddenException(`Cannot add message to ${this.resource}`);
        }

        const allowed = isOwner ? this.hasBase(user, 'add_message') : this.hasAll(user, 'add_message');

        if (!allowed) {
            throw new ForbiddenException(`Cannot add message to ${this.resource}`);
        }
    }

    async canReadMessageAttachment(ticket: TicketSelectDto, user: JwtUser, isInternal?: boolean): Promise<void> {
        let allowed = false

        const isOwner = ticket.userId === user.id

        if (this.hasAll(user, 'read')) {
            allowed = true
        } else if (this.hasBase(user, 'read')) {
            if (isOwner) {
                allowed = !isInternal
            } else {
                allowed = false
            }
        }

        if (!allowed) {
            throw new ForbiddenException('No permission to download this attachment.')
        }

    }
}
