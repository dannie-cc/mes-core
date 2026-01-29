import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import { ZodResponse } from 'nestjs-zod';

import { ErrorResponseDto } from '@/common/dto/error.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserApiResponseDto, UserPaginatedApiResponseDto } from './users.dto';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequiresPermissions } from '../auth/decorators/permission.decorator';
import { Permissions } from '@/common/permissions';

const usersEndpointConfig = {
    list: () =>
        applyDecorators(
            UseGuards(JwtAuthGuard, PermissionGuard),
            RequiresPermissions(Permissions.users.Read),
            ApiOperation({ summary: 'List users' }),
            ZodResponse({ status: 200, type: UserPaginatedApiResponseDto }),
        ),

    profileSelf: () =>
        applyDecorators(
            UseGuards(JwtAuthGuard),
            ApiOperation({ summary: 'Get current user profile' }),
            ZodResponse({ status: 200, type: UserApiResponseDto, description: 'User profile fetched successfully' }),
            ApiResponse({ status: 401, description: 'Unauthorized', type: ErrorResponseDto }),
        ),

    findOne: () =>
        applyDecorators(
            UseGuards(JwtAuthGuard, PermissionGuard),
            RequiresPermissions(Permissions.users.Read),
            ApiOperation({ summary: 'Get user profile by ID' }),
            ZodResponse({ status: 200, type: UserApiResponseDto, description: 'User profile fetched successfully' }),
            ApiResponse({ status: 401, description: 'Unauthorized', type: ErrorResponseDto }),
            ApiResponse({ status: 403, description: 'Can only view own profile', type: ErrorResponseDto }),
        ),

    updateProfile: () =>
        applyDecorators(
            UseGuards(JwtAuthGuard, PermissionGuard),
            RequiresPermissions(Permissions.users.Update),
            ApiOperation({ summary: 'Update user profile' }),
            ZodResponse({ status: 200, type: UserApiResponseDto, description: 'Profile updated successfully' }),
            ApiResponse({ status: 400, description: 'Bad request - validation failed', type: ErrorResponseDto }),
            ApiResponse({ status: 401, description: 'Unauthorized', type: ErrorResponseDto }),
            ApiResponse({ status: 403, description: 'Can only update own profile', type: ErrorResponseDto }),
        ),
} as const;

export type UsersEndpointKey = keyof typeof usersEndpointConfig;

export function UsersDecorators(endpoint: UsersEndpointKey) {
    return usersEndpointConfig[endpoint]();
}
