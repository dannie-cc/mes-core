import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AttachmentController } from './attachment.controller';

import { CustomLoggerService } from '@/app/services/logger/logger.service';
import { AttachmentService } from './attachment.service';
import { StorageModule } from '@/app/services/storage/storage.module';
import { UsersModule } from '../users/users.module';
import { FilterService } from '@/common/services/filter.service';

@Module({
    imports: [ConfigModule, StorageModule, UsersModule],
    controllers: [AttachmentController],
    providers: [AttachmentService, CustomLoggerService, FilterService],
    exports: [AttachmentService],
})
export class AttachmentModule {}
