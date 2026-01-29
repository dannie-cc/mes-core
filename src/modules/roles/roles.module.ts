import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RedisModule } from '@/app/services/redis/redis.module';
import { DrizzleModule } from '@/models/model.module';
import { CustomLoggerService } from '@/app/services/logger/logger.service';
import { RolesController } from './roles.controller';
import { UsersModule } from '../users/users.module';
import { FilterService } from '@/common/services/filter.service';

@Module({
    imports: [RedisModule, DrizzleModule, UsersModule],
    controllers: [RolesController],
    providers: [RolesService, CustomLoggerService, FilterService],
    exports: [RolesService],
})
export class RolesModule { }
