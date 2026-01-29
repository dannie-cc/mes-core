import { BasePolicy } from '@/common/base.policy';
import { Injectable } from '@nestjs/common';
import { attachments as attachmentSchema } from '@/models/schema/attachments.schema';

@Injectable()
export class AttachmentsPolicy extends BasePolicy<typeof attachmentSchema> {
    constructor() {
        super({
            table: attachmentSchema,
            resource: 'attachments',
            owner: (t) => t.userId,
        });
    }
}
