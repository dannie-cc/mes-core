import { ZodSerializerInterceptor } from 'nestjs-zod';
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';

import { RedisModule } from './services/redis/redis.module';
import { AssetsModule } from './services/assets/assets.module';
import { LoggerModule } from './services/logger/logger.module';
import { MailModule } from './services/mail/mail.module';

import { LoggingInterceptor } from './services/logger/logger.interceptor';
import { ResponseInterceptor } from '@/common/interceptors/response.interceptor';
import { SecurityHeadersMiddleware } from '@/common/middleware/security-headers.middleware';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { databaseConfig, redisConfig, serverConfig } from '@/config';
import { PermissionSeederService } from '@/models/seeder/permission-seeder.service';

import { AttachmentModule } from '@/modules/attachments/attachment.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { UsersModule } from '@/modules/users/users.module';
import { TicketModule } from '@/modules/ticket/ticket.module';
import { BomModule } from '@/modules/bom/bom.module';
import { WorkOrderModule } from '@/modules/work-order/work-order.module';
import { RolesModule } from '@/modules/roles/roles.module';
import { UserAddressesModule } from '@/modules/user-addresses/user-addresses.module';
import { HealthModule } from '@/health/health.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [databaseConfig, redisConfig, serverConfig],
        }),
        EventEmitterModule.forRoot(),
        ScheduleModule.forRoot(),
        LoggerModule,
        AssetsModule,
        RedisModule,
        MailModule,
        AttachmentModule,
        AuthModule,
        UsersModule,
        UserAddressesModule,
        TicketModule,
        BomModule,
        WorkOrderModule,
        RolesModule,
        HealthModule,
    ],
    controllers: [AppController],
    providers: [
        AppService,
        PermissionSeederService,
        // WARNING: Interceptor order matters: on the way out (response), execution is reversed.
        // We register Zod first so that the response is shaped by ResponseInterceptor,
        // then logged, and finally validated by Zod (Response -> Logging -> Zod).
        {
            provide: APP_INTERCEPTOR,
            useClass: ZodSerializerInterceptor,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: LoggingInterceptor,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: ResponseInterceptor,
        },
    ],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(SecurityHeadersMiddleware).forRoutes('*');
    }
}
