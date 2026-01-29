import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const paginationMetaSchema = z.object({
    limit: z.number().int().positive(),
    page: z.number().int().min(1),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0).optional(),
});

// Standard API response schema: { success, message, data }
export const createApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
    z.object({
        success: z.boolean(),
        message: z.string(),
        data: dataSchema,
    });

// Paginated response (matches ResponseInterceptor): { success, message, pagination, data: T[] }
export const createApiPaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
    z.object({
        success: z.boolean(),
        message: z.string(),
        pagination: paginationMetaSchema,
        data: z.array(itemSchema),
    });

// For direct DTO class creation
export const createApiResponseDto = <T extends z.ZodTypeAny>(dataSchema: T) => createZodDto(createApiResponseSchema(dataSchema));
export const createApiPaginatedResponseDto = <T extends z.ZodTypeAny>(itemSchema: T) => createZodDto(createApiPaginatedResponseSchema(itemSchema));

// Lightweight TS helpers to get strong types from the schemas
export type ApiResponseOf<T extends z.ZodTypeAny> = {
    success: boolean;
    message: string;
    data: z.infer<T>;
};

export type ApiPaginatedResponseOf<T extends z.ZodTypeAny> = {
    success: boolean;
    message: string;
    pagination: z.infer<typeof paginationMetaSchema>;
    data: Array<z.infer<T>>;
};
