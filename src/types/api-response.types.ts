import { AnyPgTable, PgView, PgViewWithSelection } from 'drizzle-orm/pg-core';
import type { ColumnFilter, JoinOperator } from './filter.types';
import type { AnyColumn, Table } from 'drizzle-orm';

/**
 * Utility type to extract only the actual column names from a Drizzle table
 * This excludes internal Drizzle properties like "_", "$inferSelect", etc.
 */
export type TableColumnNames<T extends Table> = keyof T extends string ? (T extends Table<infer TTableConfig> ? keyof TTableConfig['columns'] : never) : never;

export interface Pagination {
    limit: number;
    page: number;
    total: number;
    totalPages?: number;
}

// Deprecated: Do not use service-layer response wrappers.
// Services should return plain entities and throw exceptions on error.
// Controller shapes API with ok() and ResponseInterceptor.
// export interface ServiceResponse<T> { data: T; message: string }
// export interface PaginatedServiceResponse<T> extends Pagination { data: T[]; message: string }

/**
 * Internal payload structure returned by OkResponseBuilder[GET_PAYLOAD]()
 * This is the raw data before transformation to StandardApiResponse
 */
export interface OkResponse<T> {
    data: T;
    message: string;
    pagination?: Pagination;
}

/**
 * Standard API response structure used by all endpoints
 */
export interface StandardApiResponse<T> {
    data: T;
    message: string;
    success: boolean;
}

/**
 * Paginated API response structure for list endpoints
 */
export interface PaginatedApiResponse<T> extends StandardApiResponse<T[]> {
    pagination: Pagination;
}

/**
 * Query interface for filtered and paginated endpoints (request input)
 * Contains only the fields that clients can specify in requests
 * T = Drizzle Table type
 */
export interface FilteredQuery<T extends AnyPgTable | PgView | PgViewWithSelection> {
    page?: number;
    limit?: number;
    filters?: ColumnFilter[];
    joinOperator?: JoinOperator;
    sortBy?: string | AnyColumn;
    sortOrder?: 'asc' | 'desc';
}
