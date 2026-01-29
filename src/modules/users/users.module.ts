import { Module } from '@nestjs/common';

import { DrizzleModule } from '@/models/model.module';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { CustomLoggerService } from '@/app/services/logger/logger.service';
import { FilterService } from '@/common/services/filter.service';

@Module({
    imports: [DrizzleModule],
    controllers: [UsersController],
    providers: [UsersService, FilterService, CustomLoggerService],
    exports: [UsersService],
})
export class UsersModule {}
