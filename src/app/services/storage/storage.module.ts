import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { StorageService } from './storage.service';
import { CustomLoggerService } from '../logger/logger.service';
import { API_CONFIG_TOKEN, IAppConfiguration } from '@/config';

@Module({
    imports: [ConfigModule],
    providers: [
        {
            provide: StorageService,
            useFactory: (configService: ConfigService) => {
                const { minio } = configService.getOrThrow<IAppConfiguration>(API_CONFIG_TOKEN);
                const logger = new CustomLoggerService();
                return new StorageService(logger, minio);
            },
            inject: [ConfigService],
        },
        CustomLoggerService,
    ],
    exports: [StorageService],
})
export class StorageModule { }
