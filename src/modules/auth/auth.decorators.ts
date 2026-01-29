import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';

import { ErrorResponseDto } from '@/common/dto/error.dto';
import { SignupApiResponseDto, MessageApiResponseDto, ValidateResetCodeApiResponseDto, ResendStatusApiResponseDto, LoginApiResponseWithSettingsDto } from './auth.dto';

const authEndpointConfig = {
    signup: () =>
        applyDecorators(
            ApiOperation({ summary: 'Create a new account' }),
            ZodResponse({ status: 200, type: SignupApiResponseDto }),
            ApiResponse({ status: 400, description: 'Bad request - invalid email', type: ErrorResponseDto }),
        ),

    verifyEmail: () =>
        applyDecorators(
            ApiOperation({ summary: 'Verify the given token' }),
            ZodResponse({ status: 200, type: MessageApiResponseDto }),
            ApiResponse({ status: 400, description: 'Invalid or expired token', type: ErrorResponseDto }),
        ),

    login: () =>
        applyDecorators(
            ApiOperation({ summary: 'Login with email and return access token' }),
            ZodResponse({ status: 200, type: LoginApiResponseWithSettingsDto, description: 'Returns accessToken and user' }),
            ApiResponse({ status: 400, description: 'Invalid credentials', type: ErrorResponseDto }),
        ),
    logout: () =>
        applyDecorators(
            ApiBearerAuth(),
            ApiOperation({ summary: 'Log out the current user' }),
            ZodResponse({ status: 200, type: MessageApiResponseDto }),
            ApiResponse({ status: 401, description: 'Unauthorized', type: ErrorResponseDto }),
        ),

    changePassword: () =>
        applyDecorators(
            ApiBearerAuth(),
            ApiOperation({ summary: 'Change password' }),
            ZodResponse({ status: 200, type: MessageApiResponseDto }),
            ApiResponse({ status: 400, description: 'Validation failed', type: ErrorResponseDto }),
            ApiResponse({ status: 401, description: 'Unauthorized', type: ErrorResponseDto }),
        ),

    forgotPassword: () =>
        applyDecorators(
            ApiOperation({ summary: 'Send reset password link' }),
            ZodResponse({ status: 200, type: MessageApiResponseDto }),
            ApiResponse({ status: 400, description: 'Invalid email', type: ErrorResponseDto }),
            ApiResponse({ status: 429, description: 'Too many requests', type: ErrorResponseDto }),
        ),

    validateResetCode: () =>
        applyDecorators(
            ApiOperation({ summary: 'Validate reset code' }),
            ZodResponse({ status: 200, type: ValidateResetCodeApiResponseDto }),
            ApiResponse({ status: 400, description: 'Invalid or expired code', type: ErrorResponseDto }),
            ApiResponse({ status: 429, description: 'Too many requests', type: ErrorResponseDto }),
        ),

    resetPassword: () =>
        applyDecorators(
            ApiOperation({ summary: 'Reset password' }),
            ZodResponse({ status: 200, type: MessageApiResponseDto }),
            ApiResponse({ status: 400, description: 'Validation failed', type: ErrorResponseDto }),
        ),

    resendVerification: () =>
        applyDecorators(
            ApiOperation({ summary: 'Resend verification email' }),
            ZodResponse({ status: 200, type: ResendStatusApiResponseDto }),
            ApiResponse({ status: 400, description: 'Invalid email', type: ErrorResponseDto }),
            ApiResponse({ status: 429, description: 'Too many requests', type: ErrorResponseDto }),
        ),

    resendStatus: () => applyDecorators(ApiOperation({ summary: 'Get resend verification status' }), ZodResponse({ type: ResendStatusApiResponseDto })),
} as const;

export type AuthEndpointKey = keyof typeof authEndpointConfig;
export function AuthDecorators(endpoint: AuthEndpointKey) {
    return authEndpointConfig[endpoint]();
}
