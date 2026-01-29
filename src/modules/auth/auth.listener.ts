import { Injectable } from '@nestjs/common';
import { AuthService } from './auth.service';
import { OnEvent } from '@nestjs/event-emitter';
import { UsersService } from '../users/users.service';
import { CustomLoggerService } from '@/app/services/logger/logger.service';

@Injectable()
export class AuthEventsListener {
    constructor(
        private readonly authService: AuthService,
        private readonly userService: UsersService,
        private readonly logger: CustomLoggerService,
    ) {}

    @OnEvent('auth.roleChanged')
    async handleRoleChange(payload: { userId: string }) {
        const { userId } = payload;
        const user = await this.userService.findOne(userId);
        if (!user) {
            throw new Error('User cannot be found in role change event');
        }

        await this.authService.logout(userId);
        this.logger.log(`Role changed for user id ${userId}, logging out.`);
    }
}
