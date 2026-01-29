import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from './redis.service';
import { CustomLoggerService } from '../logger/logger.service';

@Global()
@Module({
    imports: [ConfigModule],
    providers: [RedisService, CustomLoggerService],
    exports: [RedisService],
})
export class RedisModule { }
