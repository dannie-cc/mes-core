import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { ForbiddenException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { RedisService } from '@/app/services/redis/redis.service';
import { CustomLoggerService } from '@/app/services/logger/logger.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(
        private readonly configService: ConfigService,
        private readonly redisService: RedisService,
        private readonly logger: CustomLoggerService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
        });
        this.logger.setContext(JwtStrategy.name);
    }

    async validate(payload: { sub: string; email: string; firstName: string; lastName: string; roleId: string }) {
        if (!payload || !payload.sub) {
            this.logger.warn('Invalid JWT payload', payload);
            throw new UnauthorizedException('Invalid token');
        }

        try {
            // Check if token is in Redis (still valid)
            const storedToken = await this.redisService.get(`token:${payload.sub}`);
            if (!storedToken) {
                this.logger.warn('Token not found in Redis');
                throw new UnauthorizedException('Token expired or invalid');
            }

            const roleId = payload.roleId;
            const permsValue = await this.redisService.get(`perms:${roleId}`);
            if (!permsValue) {
                this.logger.error(`Permissions for role ${roleId} missing in Redis`);
                throw new ForbiddenException('Role permissions not available');
            }

            const permissions: string[] = JSON.parse(permsValue);

            return {
                id: payload.sub,
                email: payload.email,
                firstName: payload.firstName,
                lastName: payload.lastName,
                roleId,
                permissions,
            };
        } catch (error) {
            this.logger.error('JWT validation failed:', error);
            if (error instanceof ForbiddenException || error instanceof UnauthorizedException) {
                throw error;
            }
            throw new InternalServerErrorException('Authentication service error');
        }
    }
}
