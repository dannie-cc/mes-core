import { Observable } from 'rxjs';
import { Injectable, ExecutionContext, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

import { IS_PUBLIC_KEY } from '../decorators/public.decorators';
import { CustomLoggerService } from '@/app/services/logger/logger.service';
import { JwtUser } from '@/types/jwt.types';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(
        private reflector: Reflector,
        private readonly logger: CustomLoggerService,
    ) {
        super();
        this.logger.setContext(JwtAuthGuard.name);
    }

    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
        try {
            const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
            if (isPublic) return true;

            const request = context.switchToHttp().getRequest<Request>();

            const authHeader = (request.headers as Record<string, any>)['authorization'];
            if (!authHeader) throw new UnauthorizedException('Missing authorization header');

            if (!authHeader.startsWith('Bearer ')) {
                throw new UnauthorizedException('Invalid authorization header format');
            }

            return super.canActivate(context);
        } catch (error) {
            this.logger.error('JWT Guard activation failed:', {
                error: error.message,
                stack: error.stack,
                context: {
                    class: context.getClass().name,
                    handler: context.getHandler().name,
                },
            });
            throw error;
        }
    }

    handleRequest<T extends JwtUser>(err: Error | null, user: T | false, info: Error | undefined, context: ExecutionContext, status?: any): T {
        try {
            if (err) {
                this.logger.error('JWT validation error:', { error: err.message, stack: err.stack });
                throw err;
            }

            if (!user) {
                const message = info?.message || 'Unauthorized access';
                this.logger.error('Authentication failed:', { message, info });
                throw new UnauthorizedException(message);
            }

            if (!this.validateUserObject(user)) {
                this.logger.error('Invalid user object structure:', { user });
                throw new InternalServerErrorException('Invalid user data structure');
            }

            return user;
        } catch (error) {
            this.logger.error('JWT request handling failed:', {
                error: error.message,
                stack: error.stack,
                context: {
                    class: context.getClass().name,
                    handler: context.getHandler().name,
                },
            });
            throw error;
        }
    }

    private validateUserObject(user: any): user is JwtUser {
        return (
            typeof user === 'object' &&
            typeof user.id === 'string' &&
            typeof user.email === 'string' &&
            typeof user.roleId === 'string' &&
            (user.firstName === undefined || typeof user.firstName === 'string') &&
            (user.lastName === undefined || typeof user.lastName === 'string')
        );
    }
}
