import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import { ZodResponse } from 'nestjs-zod';

import { ErrorResponseDto } from '@/common/dto/error.dto';
import { AddressApiResponseDto, AddressPaginatedApiResponseDto } from './user-addresses.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

const userAddressesEndpointConfig = {
    list: () =>
        applyDecorators(
            UseGuards(JwtAuthGuard),
            ApiOperation({ summary: 'Get all user addresses' }),
            ZodResponse({ status: 200, type: AddressPaginatedApiResponseDto }),
            ApiResponse({ status: 401, description: 'Unauthorized', type: ErrorResponseDto }),
        ),

    findOne: () =>
        applyDecorators(
            UseGuards(JwtAuthGuard),
            ApiOperation({ summary: 'Get user address by id' }),
            ZodResponse({ status: 200, type: AddressApiResponseDto }),
            ApiResponse({ status: 401, description: 'Unauthorized', type: ErrorResponseDto }),
        ),

    create: () =>
        applyDecorators(
            UseGuards(JwtAuthGuard),
            ApiOperation({ summary: 'Create a new address' }),
            ZodResponse({ status: 200, type: AddressApiResponseDto }),
            ApiResponse({ status: 400, description: 'Bad request - validation failed', type: ErrorResponseDto }),
            ApiResponse({ status: 401, description: 'Unauthorized', type: ErrorResponseDto }),
        ),

    update: () =>
        applyDecorators(
            UseGuards(JwtAuthGuard),
            ApiOperation({ summary: 'Update an address' }),
            ZodResponse({ type: AddressApiResponseDto }),
            ApiResponse({ status: 400, description: 'Bad request - validation failed', type: ErrorResponseDto }),
            ApiResponse({ status: 401, description: 'Unauthorized', type: ErrorResponseDto }),
            ApiResponse({ status: 404, description: 'Address not found', type: ErrorResponseDto }),
        ),

    setDefault: () =>
        applyDecorators(
            UseGuards(JwtAuthGuard),
            ApiOperation({ summary: 'Set address as default' }),
            ZodResponse({ type: AddressApiResponseDto }),
            ApiResponse({ status: 401, description: 'Unauthorized', type: ErrorResponseDto }),
            ApiResponse({ status: 404, description: 'Address not found', type: ErrorResponseDto }),
        ),

    remove: () =>
        applyDecorators(
            UseGuards(JwtAuthGuard),
            ApiOperation({ summary: 'Delete an address' }),
            ZodResponse({ type: AddressApiResponseDto }),
            ApiResponse({ status: 401, description: 'Unauthorized', type: ErrorResponseDto }),
            ApiResponse({ status: 404, description: 'Address not found', type: ErrorResponseDto }),
        ),
} as const;

export type UserAddressesEndpointKey = keyof typeof userAddressesEndpointConfig;
export function UserAddressesDecorators(endpoint: UserAddressesEndpointKey) {
    return userAddressesEndpointConfig[endpoint]();
}
