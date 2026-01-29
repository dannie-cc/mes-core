import { DEFAULT_CHAR_LENGTH } from '@/common/constants';
import { createApiPaginatedResponseDto, createApiResponseDto } from '@/common/helpers/api-response';
import { createStrictZodDto } from '@/common/helpers/zod-strict';
import { permissionSelectSchema, roleSelectSchema, roleUpdateSchema, userSelectSchema } from '@/models/zod-schemas';
import z from 'zod';

//Input Schemas
export const updateRolePermissionsSchema = z.object({
    permissionIds: z.array(z.string()),
});

export const updateRoleDetailsSchema = roleUpdateSchema.pick({
    name: true,
    description: true,
});

export const createRoleSchema = z.object({
    name: z.string().min(3).max(20),
    description: z.string().min(10).max(DEFAULT_CHAR_LENGTH),
});

export const assignRoleSchema = z.object({
    roleId: z.string(),
    userId: z.string(),
});

//Output Schemas
export const roleWithPermissionsListResponseSchema = roleSelectSchema.extend({
    permissions: z.array(
        permissionSelectSchema.pick({
            name: true,
            description: true,
        }),
    ),
});

// Input DTO's
export class UpdateRolePermissionsDto extends createStrictZodDto(updateRolePermissionsSchema) { }
export class UpdateRoleDetailsDto extends createStrictZodDto(updateRoleDetailsSchema) { }
export class CreateRoleDto extends createStrictZodDto(createRoleSchema) { }
export class AssignRoleDto extends createStrictZodDto(assignRoleSchema) { }

//Response DTO
export class RoleApiResponseDto extends createApiResponseDto(roleSelectSchema) { }
export class RoleWithPermissionsApiResponseDTO extends createApiResponseDto(roleWithPermissionsListResponseSchema) { }
export class RoleWithPermissionsLookupApiResponseDTO extends createApiResponseDto(z.array(roleWithPermissionsListResponseSchema)) { }
export class RolePaginatedApiResponseDto extends createApiPaginatedResponseDto(roleSelectSchema) { }
export class PermissionsListApiResponseDto extends createApiResponseDto(z.array(permissionSelectSchema)) { }
export class UpdateRolePermissionApiResponseDto extends createApiResponseDto(z.boolean()) { }
export class AssignRoleApiResponseDto extends createApiResponseDto(userSelectSchema) { }
