import { Injectable } from '@nestjs/common';
import { and, eq, gt, gte, ilike, inArray, lt, lte, ne, not, notIlike, notInArray, or, sql, type AnyColumn, type SQL, type Table } from 'drizzle-orm';
import type { PgView, PgViewWithSelection } from 'drizzle-orm/pg-core';
import type { ColumnFilter, JoinOperator } from '@/types';

@Injectable()
export class FilterService {
    /**
     * Convert column filters to Drizzle ORM SQL conditions.
     * Supports Table, PgView, PgViewWithSelection.
     */
    filterColumns<T extends Table | PgView | PgViewWithSelection>(args: { table: T; filters: ColumnFilter[]; joinOperator?: JoinOperator }): SQL | undefined {
        const { table, filters, joinOperator = 'and' } = args;

        if (!filters || filters.length === 0) {
            return undefined;
        }

        const joinFn = joinOperator === 'and' ? and : or;

        const conditions = filters.map((filter) => {
            const column = this.getColumn(table, filter.id);

            switch (filter.operator) {
                case 'iLike':
                    return filter.variant === 'text' && typeof filter.value === 'string' ? ilike(column as any, `%${filter.value}%`) : undefined;

                case 'notILike':
                    return filter.variant === 'text' && typeof filter.value === 'string' ? notIlike(column as any, `%${filter.value}%`) : undefined;

                case 'eq': {
                    if (filter.variant === 'date') {
                        const startMs = Number(filter.value);
                        if (Number.isNaN(startMs)) return undefined;
                        const start = new Date(startMs);
                        const endExclusive = new Date(startMs + 24 * 60 * 60 * 1000);
                        return and(gte(column as any, start), lt(column as any, endExclusive));
                    }
                    if (this.isDrizzleColumn(column) && column.dataType === 'boolean' && typeof filter.value === 'string') {
                        return eq(column as any, filter.value === 'true');
                    }
                    return eq(column as any, filter.value);
                }

                case 'ne': {
                    if (this.isDrizzleColumn(column) && column.dataType === 'boolean' && typeof filter.value === 'string') {
                        return ne(column as any, filter.value === 'true');
                    }
                    if (filter.variant === 'date') {
                        const startMs = Number(filter.value);
                        if (Number.isNaN(startMs)) return undefined;
                        const start = new Date(startMs);
                        const endExclusive = new Date(startMs + 24 * 60 * 60 * 1000);
                        // not on that day  =>  ts < start  OR  ts >= nextDayStart
                        return or(lt(column as any, start), gte(column as any, endExclusive));
                    }
                    return ne(column as any, filter.value);
                }

                case 'inArray':
                    if (Array.isArray(filter.value)) {
                        return inArray(column as any, filter.value as any[]);
                    }
                    return undefined;

                case 'notInArray':
                    if (Array.isArray(filter.value)) {
                        return notInArray(column as any, filter.value as any[]);
                    }
                    return undefined;

                case 'lt':
                    return filter.variant === 'number' || filter.variant === 'range'
                        ? lt(column as any, filter.value)
                        : filter.variant === 'date' && typeof filter.value === 'string'
                          ? (() => {
                                const ms = Number(filter.value);
                                if (Number.isNaN(ms)) return undefined;
                                // before end-of-day  =>  < nextDayStart
                                return lt(column as any, new Date(ms + 24 * 60 * 60 * 1000));
                            })()
                          : undefined;

                case 'lte':
                    return filter.variant === 'number' || filter.variant === 'range'
                        ? lte(column as any, filter.value)
                        : filter.variant === 'date' && typeof filter.value === 'string'
                          ? (() => {
                                const ms = Number(filter.value);
                                if (Number.isNaN(ms)) return undefined;
                                // <= end-of-day  =>  < nextDayStart (half-open)
                                return lt(column as any, new Date(ms + 24 * 60 * 60 * 1000));
                            })()
                          : undefined;

                case 'gt':
                    return filter.variant === 'number' || filter.variant === 'range'
                        ? gt(column as any, filter.value)
                        : filter.variant === 'date' && typeof filter.value === 'string'
                          ? (() => {
                                const ms = Number(filter.value);
                                if (Number.isNaN(ms)) return undefined;
                                // after start-of-day (exclusive)
                                return gt(column as any, new Date(ms));
                            })()
                          : undefined;

                case 'gte':
                    return filter.variant === 'number' || filter.variant === 'range'
                        ? gte(column as any, filter.value)
                        : filter.variant === 'date' && typeof filter.value === 'string'
                          ? (() => {
                                const ms = Number(filter.value);
                                if (Number.isNaN(ms)) return undefined;
                                // from start-of-day (inclusive)
                                return gte(column as any, new Date(ms));
                            })()
                          : undefined;

                case 'isBetween': {
                    if (filter.variant === 'dateRange' && Array.isArray(filter.value)) {
                        const startMs = Number(filter.value[0]);
                        const endMs = filter.value[1] ? Number(filter.value[1]) : startMs;

                        if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
                            return undefined;
                        }

                        // [start, endExclusive)
                        const start = new Date(startMs);
                        const endExclusive = new Date(endMs + 24 * 60 * 60 * 1000);

                        return and(gte(column as any, start), lt(column as any, endExclusive));
                    }

                    if ((filter.variant === 'number' || filter.variant === 'range') && Array.isArray(filter.value) && filter.value.length === 2) {
                        const firstRaw = filter.value[0];
                        const secondRaw = filter.value[1];
                        const firstValue = firstRaw && String(firstRaw).trim() !== '' ? Number(firstRaw) : null;
                        const secondValue = secondRaw && String(secondRaw).trim() !== '' ? Number(secondRaw) : null;

                        if (firstValue === null && secondValue === null) {
                            return undefined;
                        }
                        if (firstValue !== null && secondValue === null) {
                            return eq(column as any, firstValue);
                        }
                        if (firstValue === null && secondValue !== null) {
                            return eq(column as any, secondValue);
                        }

                        return and(firstValue !== null ? gte(column as any, firstValue) : undefined, secondValue !== null ? lte(column as any, secondValue) : undefined);
                    }
                    return undefined;
                }

                case 'isRelativeToToday': {
                    if ((filter.variant === 'date' || filter.variant === 'dateRange') && typeof filter.value === 'string') {
                        const now = new Date();
                        const [amountStr, unit] = filter.value.split(' ') ?? [];
                        if (!amountStr || !unit) return undefined;

                        const amount = Number.parseInt(amountStr, 10);
                        if (Number.isNaN(amount)) return undefined;

                        // Local midnight “today”
                        const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());

                        let start: Date;
                        let endExclusive: Date;

                        switch (unit) {
                            case 'days': {
                                const startMs = base.getTime() + amount * 24 * 60 * 60 * 1000;
                                start = new Date(startMs);
                                endExclusive = new Date(startMs + 24 * 60 * 60 * 1000);
                                break;
                            }
                            case 'weeks': {
                                const startMs = base.getTime() + amount * 7 * 24 * 60 * 60 * 1000;
                                start = new Date(startMs);
                                endExclusive = new Date(startMs + 7 * 24 * 60 * 60 * 1000);
                                break;
                            }
                            case 'months': {
                                start = new Date(base);
                                start.setMonth(start.getMonth() + amount);

                                endExclusive = new Date(start);
                                endExclusive.setMonth(endExclusive.getMonth() + 1);
                                break;
                            }
                            default:
                                return undefined;
                        }

                        return and(gte(column as any, start), lt(column as any, endExclusive));
                    }
                    return undefined;
                }

                case 'isEmpty':
                    return this.isEmpty(column);

                case 'isNotEmpty':
                    return not(this.isEmpty(column));

                default:
                    throw new Error(`Unsupported operator: ${filter.operator}`);
            }
        });

        const valid = conditions.filter((c): c is SQL => c !== undefined);

        return valid.length > 0 ? joinFn(...valid) : undefined;
    }

    /**
     * Get a column/expression by key from a Table, PgView, or PgViewWithSelection.
     * Returns AnyColumn for real table/view columns or SQL for aliased expressions.
     * Supports dot notation for nested columns.
     */
    private getColumn(table: Table | PgView | PgViewWithSelection, columnKey: string): AnyColumn | SQL {
        if (columnKey.includes('.')) {
            const parts = columnKey.split('.');
            let current: any = table;

            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];

                if (!current || typeof current !== 'object') {
                    throw new Error(`Column '${columnKey}' not found: invalid path at '${parts.slice(0, i).join('.')}'`);
                }

                current = current[part];

                if (current === undefined) {
                    throw new Error(`Column '${columnKey}' not found: '${part}' does not exist on '${parts.slice(0, i).join('.') || 'table'}'`);
                }
            }

            if (!this.isDrizzleColumn(current)) {
                throw new Error(`Column '${columnKey}' is not a valid Drizzle column or SQL expression`);
            }

            return current as AnyColumn | SQL;
        }

        // Fallback to direct access
        const col = (table as any)?.[columnKey];

        if (!col) {
            throw new Error(`Column '${columnKey}' not found on table`);
        }

        if (!this.isDrizzleColumn(col)) {
            throw new Error(`Column '${columnKey}' is not a valid Drizzle column or SQL expression`);
        }

        return col as AnyColumn | SQL;
    }

    /**
     * Type guard to check if value is a valid Drizzle column or SQL expression.
     *
     * - Drizzle columns (tables/views) expose `dataType` or `columnType`
     * - SQL expressions expose `_type`, `decoder`, or `mapFromDriverValue`
     */
    private isDrizzleColumn(value: unknown): value is AnyColumn {
        if (!value || typeof value !== 'object') {
            return false;
        }

        if ('dataType' in value || 'columnType' in value) {
            return true;
        }

        if ('_type' in value || 'decoder' in value || 'mapFromDriverValue' in value) {
            return true;
        }

        return false;
    }

    /**
     * Check if column/expression is empty (null, '', '[]', or '{}')
     */
    private isEmpty(column: AnyColumn | SQL) {
        return sql<boolean>`
      CASE
        WHEN ${column} IS NULL THEN TRUE
        WHEN ${column} = '' THEN TRUE
        WHEN ${column}::text = '[]' THEN TRUE
        WHEN ${column}::text = '{}' THEN TRUE
        ELSE FALSE
      END
    `;
    }

    /**
     * Validate that filters are properly formed
     */
    validateFilters(filters: ColumnFilter[]): ColumnFilter[] {
        return filters.filter((f) => {
            if (f.operator === 'isEmpty' || f.operator === 'isNotEmpty') return true;

            if (Array.isArray(f.value)) return f.value.length > 0;

            return f.value !== '' && f.value !== null && f.value !== undefined;
        });
    }
}
