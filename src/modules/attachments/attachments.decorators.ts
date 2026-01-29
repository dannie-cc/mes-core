import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';

import { ErrorResponseDto } from '@/common/dto/error.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequiresPermissions } from '../auth/decorators/permission.decorator';
import { Permissions } from '@/common/permissions';
import {
    AttachmentApiPaginatedResponseDto,
    AttachmentApiResponseDto,
    DownloadAttachmentApiResponseDto,
    UploadAttachmentApiResponseDto,
    ValidateOrderAttachmentsApiResponseDto,
} from './attachment.dto';
import { ZodResponse } from 'nestjs-zod';

const attachmentsEndpointConfig = {
    upload: () =>
        applyDecorators(
            UseGuards(JwtAuthGuard, PermissionGuard),
            RequiresPermissions(Permissions.attachments.Write),
            ApiOperation({ summary: 'Get presigned URL for file upload' }),
            ZodResponse({ status: 200, type: UploadAttachmentApiResponseDto, description: 'Returns presigned URL for upload' }),
            ApiResponse({ status: 400, description: 'Validation failed', type: ErrorResponseDto }),
        ),
    confirm: () =>
        applyDecorators(
            UseGuards(JwtAuthGuard, PermissionGuard),
            RequiresPermissions(Permissions.attachments.Write),
            ApiOperation({ summary: 'Confirm file is uploaded successfully.' }),
            ZodResponse({ status: 200, type: AttachmentApiResponseDto, description: 'Returns uploaded file document' }),
            ApiResponse({ status: 400, description: 'Invalid payload', type: ErrorResponseDto }),
            ApiResponse({ status: 401, description: 'Unauthorized', type: ErrorResponseDto }),
        ),
    get: () =>
        applyDecorators(
            UseGuards(JwtAuthGuard, PermissionGuard),
            RequiresPermissions(Permissions.attachments.Read),
            ApiOperation({ summary: 'Get presigned URL for file download' }),
            ZodResponse({ status: 200, type: DownloadAttachmentApiResponseDto, description: 'Returns uploaded file document' }),
            ApiResponse({ status: 401, description: 'Unauthorized', type: ErrorResponseDto }),
            ApiResponse({ status: 403, description: 'Forbidden - Access denied', type: ErrorResponseDto }),
        ),
    delete: () =>
        applyDecorators(
            UseGuards(JwtAuthGuard, PermissionGuard),
            RequiresPermissions(Permissions.attachments.Delete),
            ApiOperation({ summary: 'Hard deletes an Attachment by id' }),
            ZodResponse({ status: 200, type: AttachmentApiResponseDto, description: 'Returns uploaded file document' }),
            ApiResponse({ status: 401, description: 'Unauthorized', type: ErrorResponseDto }),
            ApiResponse({ status: 403, description: 'Forbidden - Access denied', type: ErrorResponseDto }),
        ),
    ['validate-delete']: () =>
        applyDecorators(
            UseGuards(JwtAuthGuard),
            ApiOperation({ summary: 'Checks if an attachment deletable' }),
            ZodResponse({ status: 200, type: ValidateOrderAttachmentsApiResponseDto, description: 'Returns uploaded file document' }),
            ApiResponse({ status: 401, description: 'Unauthorized', type: ErrorResponseDto }),
            ApiResponse({ status: 403, description: 'Forbidden - Access denied', type: ErrorResponseDto }),
        ),
    list: () =>
        applyDecorators(
            UseGuards(JwtAuthGuard, PermissionGuard),
            RequiresPermissions(Permissions.attachments.ReadAll),
            ApiOperation({ summary: 'List all user attachments ' }),
            ZodResponse({ status: 200, type: AttachmentApiPaginatedResponseDto, description: 'Returns uploaded file documents' }),
            ApiResponse({ status: 403, description: 'Forbidden - Admin access required', type: ErrorResponseDto }),
        ),
    'my-files': () =>
        applyDecorators(
            UseGuards(JwtAuthGuard, PermissionGuard),
            RequiresPermissions(Permissions.attachments.Read),
            ApiOperation({ summary: 'Get current users orders' }),
            ZodResponse({ status: 200, type: AttachmentApiPaginatedResponseDto, description: 'Returns uploaded file documents' }),
            ApiResponse({ status: 401, description: 'Unauthorized', type: ErrorResponseDto }),
        ),
    streamThumbnail: () =>
        applyDecorators(
            UseGuards(JwtAuthGuard, PermissionGuard),
            RequiresPermissions(Permissions.attachments.Read),
            ApiOperation({ summary: 'Stream thumbnail for image attachments' }),
            ApiResponse({ status: 403, description: 'Forbidden - Admin access required', type: ErrorResponseDto }),
        ),
} as const;

export type AttachmentsEndpointKey = keyof typeof attachmentsEndpointConfig;
export function AttachmentsDecorators(endpoint: AttachmentsEndpointKey) {
    return attachmentsEndpointConfig[endpoint]();
}
