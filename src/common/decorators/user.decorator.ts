import { JwtUser } from '@/types/jwt.types';
import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext): JwtUser => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
        throw new UnauthorizedException('Missing authenticated user. Ensure an auth guard (e.g., JwtAuthGuard) is applied.');
    }

    return user;
});
