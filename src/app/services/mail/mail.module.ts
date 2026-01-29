import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { MailService } from './mail.service';
import { CustomLoggerService } from '@/app/services/logger/logger.service';

@Module({
    providers: [MailService, ConfigService, CustomLoggerService],
    exports: [MailService],
})
export class MailModule {}
