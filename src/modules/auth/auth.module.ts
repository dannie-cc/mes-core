import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { Module } from '@nestjs/common';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';

import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';

import { CustomLoggerService } from '@/app/services/logger/logger.service';
import { API_CONFIG_TOKEN, IAppConfiguration } from '@/config';
import { MailModule } from '@/app/services/mail/mail.module';
import { RolesModule } from '../roles/roles.module';
import { AuthEventsListener } from './auth.listener';

@Module({
    imports: [
        UsersModule,
        MailModule,
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => {
                const { jwt } = configService.getOrThrow<IAppConfiguration>(API_CONFIG_TOKEN);
                return {
                    secret: jwt.secret,
                    signOptions: {
                        expiresIn: jwt.expiration,
                        issuer: jwt.issuer,
                        algorithm: jwt.algorithm as JwtSignOptions['algorithm'],
                    },
                };
            },
            inject: [ConfigService],
        }),
        RolesModule,
    ],
    controllers: [AuthController],
    providers: [AuthService, AuthEventsListener, LocalStrategy, JwtStrategy, CustomLoggerService],
    exports: [AuthService],
})
export class AuthModule {}
