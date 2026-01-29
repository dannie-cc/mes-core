import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// Force strictness for object schemas; leave other schema types unchanged
const toStrictSchema = <T extends z.ZodTypeAny>(schema: T): T => {
    if (schema instanceof z.ZodObject) {
        return schema.strict() as unknown as T;
    }
    return schema;
};

// Replacement for createZodDto that makes object schemas strict by default
export const createStrictZodDto = <T extends z.ZodTypeAny>(schema: T) => createZodDto(toStrictSchema(schema));
