import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permission.decorator';
import { flattenPermissions } from '@/utils';
import { Permissions } from '@/common/permissions';
import { Permission } from '@/types';

const AllPermissions = new Set(flattenPermissions(Permissions));

@Injectable()
export class PermissionGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(ctx: ExecutionContext): boolean {
        const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [ctx.getHandler(), ctx.getClass()]);

        if (!required) return true;

        const req = ctx.switchToHttp().getRequest();
        const user = req?.user;
        if (!user) throw new UnauthorizedException();
        const userPerms: Permission[] = Array.isArray(user.permissions) ? user.permissions : [];
        if (userPerms.length === 0) throw new ForbiddenException('User has no permissions');

        return required.every((reqPerm) => userPerms.some((p) => this.covers(p, reqPerm)));
    }

    private covers(userPerm: Permission, required: Permission): boolean {
        /**
         * Permission matching rules (deliberately strict):
         * - Every string (user-held or required) MUST be declared in permissions.ts.
         * - No implicit prefix acceptance: if 'orders.read' is required, it must be declared even
         *   if 'orders.read.all' or 'orders.read.engineer' exists.
         * - Extension rule: resource.action.extension covers resource.action (only if that base is declared).
         * - '.all' wildcard: resource.action.all covers resource.action and any resource.action.* extension.
         *
         * Rationale: prevent silent typos, keep docs/admin UI aligned, avoid accidental privilege broadening,
         * and make the permission surface fully auditable.
         */
        if (!AllPermissions.has(userPerm) || !AllPermissions.has(required)) {
            return false;
        }

        if (userPerm === required) return true;

        const userParts = userPerm.split('.');
        const reqParts = required.split('.');

        // --- case .all ---
        // user has resource.action.all
        // required is resource.action or resource.action.someExtension
        if (userParts.length === 3 && userParts[2] === 'all') {
            return (
                userParts[0] === reqParts[0] && // same resource
                userParts[1] === reqParts[1] // same action
            );
        }

        // --- case extension ---
        // "order.read.engineer" satisfies "order.read"
        if (
            reqParts.length === 2 &&
            userParts[0] === reqParts[0] &&
            userParts[1] === reqParts[1] &&
            userParts.length > 2 // user has extension
        ) {
            return true;
        }

        return false;
    }
}
