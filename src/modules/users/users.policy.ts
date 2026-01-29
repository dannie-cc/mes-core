import { BasePolicy } from '@/common/base.policy';
import { Injectable } from '@nestjs/common';
import { user as userSchema } from '@/models/schema/users.schema';

@Injectable()
export class UsersPolicy extends BasePolicy<typeof userSchema> {
    constructor() {
        super({
            table: userSchema,
            resource: 'users',
            owner: (t) => t.id,
        });
    }
}
