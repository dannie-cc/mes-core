import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers['authorization'];
        // If no token, allow request to proceed
        if (!authHeader) {
            return true;
        }
        // If token exists, run normal JwtAuthGuard logic
        const result = await super.canActivate(context);
        return Boolean(result);
    }

    // Match base type signature to satisfy typing while allowing optional auth
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handleRequest<TUser = any>(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        err: any,
        user: TUser,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        _info: any,
        _context?: ExecutionContext,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        _status?: any,
    ): TUser {
        // If token is invalid, allow request to proceed without user
        if (err || !user) {
            return null as unknown as TUser;
        }
        return user;
    }
}
