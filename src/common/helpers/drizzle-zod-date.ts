import { z } from 'zod';

/**
 * Helper for input schemas that need to coerce date strings to Date objects
 */
export function createTimestampInputOverrides(fieldNames: string[] = []) {
    const defaultFields = ['createdAt', 'updatedAt', 'deletedAt', 'expiresAt', 'orderDate', 'lastMessageAt', 'completedAt', 'approvedAt', 'skippedAt', 'dueAt', 'startedAt'];
    const allFields = [...defaultFields, ...fieldNames];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const overrides: Record<string, any> = {};

    for (const fieldName of allFields) {
        // For inputs, coerce string to Date
        overrides[fieldName] = z.iso.datetime().optional();
    }

    return overrides;
}

/**
 * Helper to create timestamp field overrides with preprocessing for Drizzle Zod schemas
 * Automatically converts Date objects to ISO strings during validation
 * This handles the case where the database returns Date objects but we need ISO strings for API responses
 */
export function createTimestampPreprocessOverrides(fieldNames: string[] = []) {
    // Default timestamp fields to override
    const defaultFields = ['createdAt', 'updatedAt', 'deletedAt', 'expiresAt', 'orderDate', 'lastMessageAt', 'completedAt', 'approvedAt', 'skippedAt', 'dueAt', 'startedAt'];
    const allFields = [...defaultFields, ...fieldNames];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const overrides: Record<string, any> = {};

    for (const fieldName of allFields) {
        // Preprocess Date objects to ISO strings, then validate as datetime string
        overrides[fieldName] = z.preprocess((val) => {
            if (val instanceof Date) {
                return val.toISOString();
            }
            return val;
        }, z.iso.datetime().nullable().optional());
    }

    return overrides;
}

/**
 * Predefined preprocessing overrides for common timestamp fields
 * Use this when you need to handle Date objects from the database
 */
export const standardTimestampPreprocessOverrides = createTimestampPreprocessOverrides();

/**
 * Predefined input overrides for common timestamp fields
 */
export const standardTimestampInputOverrides = createTimestampInputOverrides();
