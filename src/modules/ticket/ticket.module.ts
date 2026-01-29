import { Module } from '@nestjs/common';
import { TicketController } from './ticket.controller';
import { TicketService } from './ticket.service';
import { CustomLoggerService } from '@/app/services/logger/logger.service';
import { FilterService } from '@/common/services/filter.service';
import { RecaptchaService } from '@/common/services/recaptcha.service';
import { UsersModule } from '../users/users.module';
import { MailModule } from '@/app/services/mail/mail.module';
import { RolesModule } from '../roles/roles.module';
import { AttachmentModule } from '../attachments/attachment.module';
import { StorageModule } from '@/app/services/storage/storage.module';

@Module({
    imports: [MailModule, UsersModule, RolesModule, AttachmentModule, StorageModule],
    controllers: [TicketController],
    providers: [TicketService, RecaptchaService, CustomLoggerService, FilterService],
    exports: [TicketService],
})
export class TicketModule { }
