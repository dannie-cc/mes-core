import { createZodDto } from 'nestjs-zod';
import { createStrictZodDto } from '@/common/helpers/zod-strict';
import { z } from 'zod';
import { standardTimestampPreprocessOverrides } from '@/common/helpers/drizzle-zod-date';
import { attachmentInsertSchema, attachmentSelectSchema, attachmentUpdateSchema } from '@/models/zod-schemas';

import { createApiPaginatedResponseSchema, createApiResponseSchema } from '@/common/helpers/api-response';
import { FILE_TYPE } from '@/common/enums';

//Input Schemas
const uploadAttachmentSchema = z
    .object({
        mimeType: z.string().min(1, 'Mime type is required'),
        fileName: z.string().min(1, 'File name is required'),
        type: z.enum(FILE_TYPE, {
            message: 'Invalid file type',
        }),
    })
    .strict();

const createAttachmentSchema = attachmentInsertSchema.omit({
    id: true,
    userId: true, // Will be set from JWT context
    isUploaded: true, // Initially false
    createdAt: true,
    updatedAt: true,
    deletedAt: true,
});

const updateAttachmentSchema = attachmentUpdateSchema.omit({
    id: true,
    userId: true,
    createdAt: true,
    updatedAt: true,
    deletedAt: true,
});

//Output Schemas

const uploadAttachmentResponseSchema = z.object({
    attachmentId: z.uuid(),
    url: z.url(),
    expiresAt: standardTimestampPreprocessOverrides.expiresAt,
});

const validateOrderAttachmentsResponseSchema = z.record(
    z.string(),
    z.array(
        z.object({
            order: z.object({
                id: z.string(),
                trackingNumber: z.string(),
                orderDate: standardTimestampPreprocessOverrides.orderDate,
            }),
            version: z.number(),
        }),
    ),
);

const downloadAttachmentResponseSchema = z.object({
    attachment: attachmentSelectSchema,
    url: z.string(),
});

//Api Response Schemas --
const attachmentApiResponseSchema = createApiResponseSchema(attachmentSelectSchema);
const downloadAttachmentApiResponseSchema = createApiResponseSchema(downloadAttachmentResponseSchema);
const attachmentApiPaginatedResponseSchema = createApiPaginatedResponseSchema(attachmentSelectSchema);
const uploadAttachmentApiResponseSchema = createApiResponseSchema(uploadAttachmentResponseSchema);
const validateOrderAttachmentsApiResponseSchema = createApiResponseSchema(validateOrderAttachmentsResponseSchema);

//Input DTO's
export class UploadAttachmentDto extends createStrictZodDto(uploadAttachmentSchema) {}
export class CreateAttachmentDto extends createStrictZodDto(createAttachmentSchema) {}
export class UpdateAttachmentDto extends createStrictZodDto(updateAttachmentSchema) {}

//Output DTO's
export class ValidateOrderAttachmentsApiResponseDto extends createZodDto(validateOrderAttachmentsApiResponseSchema) {}
export class AttachmentApiResponseDto extends createZodDto(attachmentApiResponseSchema) {}
export class UploadAttachmentApiResponseDto extends createZodDto(uploadAttachmentApiResponseSchema) {}
export class AttachmentApiPaginatedResponseDto extends createZodDto(attachmentApiPaginatedResponseSchema) {}
export class DownloadAttachmentApiResponseDto extends createZodDto(downloadAttachmentApiResponseSchema) {}

// Type exports for service layer
export type UploadAttachmentInput = z.infer<typeof uploadAttachmentSchema>;
export type CreateAttachmentInput = z.infer<typeof createAttachmentSchema>;
export type UpdateAttachmentInput = z.infer<typeof updateAttachmentSchema>;

export type ValidateOrderAttachmentsOutput = z.infer<typeof validateOrderAttachmentsResponseSchema>;
