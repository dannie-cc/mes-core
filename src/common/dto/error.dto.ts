import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Standard error response DTO (for Swagger documentation)
const errorResponseSchema = z.object({
    statusCode: z.number(),
    message: z.union([z.string(), z.array(z.string())]),
    error: z.string().optional(),
    path: z.string().optional(),
});

export class ErrorResponseDto extends createZodDto(errorResponseSchema) {}
