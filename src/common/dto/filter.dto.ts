import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const filterOperatorSchema = z.enum([
    'iLike',
    'notILike',
    'eq',
    'ne',
    'inArray',
    'notInArray',
    'isEmpty',
    'isNotEmpty',
    'lt',
    'lte',
    'gt',
    'gte',
    'isBetween',
    'isRelativeToToday',
]);

const filterVariantSchema = z.enum(['text', 'number', 'range', 'date', 'dateRange', 'boolean', 'select', 'multiSelect']);

const joinOperatorSchema = z.enum(['and', 'or']);

export const columnFilterSchema = z.object({
    id: z.string().describe('Column identifier to filter on'),
    operator: filterOperatorSchema.describe('Filter operator to apply'),
    value: z.union([z.string(), z.number(), z.array(z.string()), z.array(z.number())]).describe('Filter value(s)'),
    variant: filterVariantSchema.describe('Filter variant type'),
    joinOperator: joinOperatorSchema.optional().describe('Join operator for combining with other filters'),
});

export class ColumnFilterDto extends createZodDto(columnFilterSchema) {}

// Filter query schema with preprocess to accept JSON string at runtime but document as array(ColumnFilter)
const filterQuerySchema = z.object({
    filters: z
        .preprocess((val) => {
            if (typeof val === 'string') {
                try {
                    const parsed = JSON.parse(val);
                    return parsed;
                } catch {
                    return val;
                }
            }
            return val;
        }, z.array(columnFilterSchema))
        .optional()
        .describe('Array of column filters (accepts JSON string input at runtime).'),
    joinOperator: joinOperatorSchema.optional().default('and').describe('Global join operator for combining all filters'),
});

export class FilterQueryDto extends createZodDto(filterQuerySchema) {}

const paginatedFilterQuerySchema = filterQuerySchema.extend({
    page: z.coerce.number().int().min(1).optional().default(1).describe('Page number (1-based)'),
    limit: z.coerce.number().int().min(1).max(100).optional().default(10).describe('Number of items per page'),
    sortBy: z.string().optional().describe('Column to sort by'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc').describe('Sort order'),
});

export class PaginatedFilterQueryDto extends createZodDto(paginatedFilterQuerySchema) {}
