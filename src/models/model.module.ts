import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DrizzleService } from './model.service';
import { CustomLoggerService } from '@/app/services/logger/logger.service';

@Global()
@Module({
    imports: [ConfigModule],
    providers: [DrizzleService, CustomLoggerService],
    exports: [DrizzleService],
})
export class DrizzleModule {}
