import { and, asc, desc, eq, getTableColumns, sql, type AnyColumn, type SQL, type SelectedFields } from 'drizzle-orm';
import type { AnyPgColumn, AnyPgTable, PgView, PgViewWithSelection } from 'drizzle-orm/pg-core';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { ColumnFilter, FilteredQuery, Pagination } from '@/types';
import type { PaginatedFilterQueryDto } from '@/common/dto/filter.dto';
import { FilterService } from '@/common/services/filter.service';
import type { InferSelectModel } from 'drizzle-orm';

type DrizzleColumn = AnyColumn;

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
type RowOf<T> = T extends AnyPgTable ? InferSelectModel<T> : unknown;
type PgSource = AnyPgTable | PgView | PgViewWithSelection;
type JoinSpec = {
    kind: 'left' | 'inner';
    table: PgSource;
    on: SQL;
};

export class FilterableQueryBuilder<TSource extends PgSource> {
    private wheres: SQL[] = [];
    private joins: JoinSpec[] = [];
    private page = DEFAULT_PAGE;
    private limit = DEFAULT_LIMIT;
    private orderClause?: SQL;
    private defaultSortColumn?: string | DrizzleColumn;
    private countDistinctOn?: DrizzleColumn;
    private rootId?: AnyPgColumn | SQL;
    private orderExpr?: DrizzleColumn | SQL;
    private orderDir: 'asc' | 'desc' = 'desc';
    private groupByExpressions: (DrizzleColumn | SQL)[] = [];

    constructor(
        private readonly db: NodePgDatabase<any>,
        private readonly table: TSource,
        private readonly filterService: FilterService,
        options?: {
            defaultSortColumn?: string | DrizzleColumn;
            countDistinctOn?: DrizzleColumn;
        },
    ) {
        this.defaultSortColumn = options?.defaultSortColumn;
        this.countDistinctOn = options?.countDistinctOn;
    }

    // Add LEFT/INNER join (for filtering or later selection needs)
    join(table: PgSource, on: SQL, kind: 'left' | 'inner' = 'left') {
        this.joins.push({ kind, table, on });
        return this;
    }

    where(condition?: SQL) {
        if (condition) this.wheres.push(condition);
        return this;
    }

    filter(input: FilteredQuery<TSource> | PaginatedFilterQueryDto | { filters?: ColumnFilter[]; joinOperator?: 'and' | 'or' }) {
        const filters = (input as any)?.filters as ColumnFilter[] | undefined;
        const joinOperator = ((input as any)?.joinOperator ?? 'and') as 'and' | 'or';

        if (filters?.length) {
            const valid = this.filterService.validateFilters(filters);
            if (valid.length) {
                const where = this.filterService.filterColumns({
                    table: this.table,
                    filters: valid,
                    joinOperator,
                });
                if (where) this.wheres.push(where);
            }
        }
        return this;
    }

    paginate(input: { page?: number; limit?: number } | PaginatedFilterQueryDto) {
        const page = Math.max(1, input.page ?? DEFAULT_PAGE);
        const limit = Math.max(1, Math.min(100, input.limit ?? DEFAULT_LIMIT));
        this.page = page;
        this.limit = limit;
        return this;
    }

    orderBy(column: string | DrizzleColumn, direction: 'asc' | 'desc' = 'desc') {
        let col: any;
        if (typeof column === 'string') {
            col = (this.table as any)[column];
            if (!this.isColumn(col)) {
                const firstKey = this.getFirstColumnKey();
                col = (this.table as any)[firstKey];
            }
        } else {
            col = column;
        }
        this.orderExpr = col;
        this.orderDir = direction;
        this.orderClause = direction === 'asc' ? asc(col) : desc(col);
        return this;
    }

    // Use sort info from DTO/query with a fallback
    orderByFromQuery(input: { sortBy?: string; sortOrder?: 'asc' | 'desc' }, fallback?: string | DrizzleColumn) {
        const sortBy = (input.sortBy as string | undefined) ?? fallback ?? this.defaultSortColumn;
        const sortOrder = input.sortOrder ?? 'desc';
        if (sortBy) this.orderBy(sortBy, sortOrder);
        return this;
    }

    // If joins may duplicate base rows, set a distinct count column
    countDistinct(column: DrizzleColumn) {
        this.countDistinctOn = column;
        return this;
    }

    //  define the unique root identifier to dedupe pagination
    uniqueOn(column: AnyPgColumn) {
        this.rootId = column;
        return this;
    }

    groupBy(...columns: Array<string | DrizzleColumn | SQL | Array<string | DrizzleColumn | SQL>>) {
        if (this.countDistinctOn) {
            throw new Error('countDistinct cannot be combined with groupBy, doc! Use explicit COUNT(DISTINCT ...) in your selectFields instead.');
        }
        const flat = columns.flatMap((column) => (Array.isArray(column) ? column : [column]));
        const resolved = flat.map((column) => this.resolveGroupByExpression(column));

        for (const expr of resolved) {
            // Note: deduplication only works reliably for column references, not SQL expressions
            if (!this.groupByExpressions.includes(expr)) {
                this.groupByExpressions.push(expr);
            }
        }
        return this;
    }

    async select() {
        if (this.groupByExpressions.length > 0) {
            if (this.rootId) {
                throw new Error('groupBy cannot be combined with uniqueOn pagination');
            }
            throw new Error('groupBy cannot be used with select(); use selectFields(...) and aggregate/group your fields');
        }

        const offset = (this.page - 1) * this.limit;

        // Build WHERE once
        const combinedWhere = this.wheres.length === 0 ? undefined : this.wheres.length === 1 ? this.wheres[0] : and(...this.wheres);

        // If we have joins AND a unique root id, do dedupbed pagination:
        // 1) page on distinct root ids, 2) fetch base rows for those ids.
        if (this.joins.length > 0 && this.rootId) {
            // 1) build ids subquery
            // Build an aggregated sort key so we can order groups (root ids) even when
            // sorting by a joined column. For asc use min(), for desc use max().
            const baseSortExpr = (this.orderExpr ?? this.rootId) as AnyPgColumn | SQL;
            const sortAgg =
                this.orderDir === 'asc'
                    ? sql`${sql.raw('min(')}${baseSortExpr}${sql.raw(')')}`.as('__sort__')
                    : sql`${sql.raw('max(')}${baseSortExpr}${sql.raw(')')}`.as('__sort__');

            const idsFields = {
                id: this.rootId as AnyPgColumn,
                __sort__: sortAgg,
            } satisfies SelectedFields<any, any>;

            let idsQ: any = this.db.select(idsFields).from(this.table as any);

            for (const j of this.joins) {
                idsQ = j.kind === 'left' ? idsQ.leftJoin(j.table, j.on) : idsQ.innerJoin(j.table, j.on);
            }
            if (combinedWhere) idsQ = idsQ.where(combinedWhere);

            idsQ = idsQ.groupBy(this.rootId);

            // Order groups by the aggregated sort key (preserves intended ordering)
            idsQ = this.orderDir === 'asc' ? idsQ.orderBy(sql`"__sort__" asc`) : idsQ.orderBy(sql`"__sort__" desc`);

            idsQ = idsQ.limit(this.limit).offset(offset);
            const ids = idsQ.as('ids');

            // 2) fetch base rows for the paged ids
            const baseFields = getTableColumns(this.table as any);
            let q: any = this.db
                .select(baseFields)
                .from(this.table as any)
                .innerJoin(ids, eq(ids.id, this.rootId));

            // Keep ordering consistent
            // Order outer rows by the propagated aggregated sort key
            q = this.orderDir === 'asc' ? q.orderBy(sql`"ids"."__sort__" asc`) : q.orderBy(sql`"ids"."__sort__" desc`);

            const data = (await q) as RowOf<TSource>[];

            // Count distinct root ids for total
            let cq: any = this.db.select({ count: sql<number>`count(distinct ${this.rootId})` }).from(this.table as any);
            for (const j of this.joins) {
                cq = j.kind === 'left' ? cq.leftJoin(j.table, j.on) : cq.innerJoin(j.table, j.on);
            }
            if (combinedWhere) cq = cq.where(combinedWhere);
            const [{ count }] = await cq;

            return {
                data,
                total: Number(count),
                page: this.page,
                limit: this.limit,
            } as { data: RowOf<TSource>[] } & Pagination;
        }

        // No joins or no unique root id: original simple path
        let q: any;
        if (this.joins.length === 0) {
            q = this.db.select().from(this.table as PgSource);
        } else {
            const baseFields = getTableColumns(this.table as any);
            q = this.db.select(baseFields).from(this.table as PgSource);
        }

        // Apply joins
        for (const j of this.joins) {
            q = j.kind === 'left' ? q.leftJoin(j.table, j.on) : q.innerJoin(j.table, j.on);
        }

        // Apply where
        if (combinedWhere) q = q.where(combinedWhere);

        // Apply order
        if (this.orderClause) {
            q = q.orderBy(this.orderClause);
        } else if (!this.groupByExpressions.length && this.defaultSortColumn) {
            const fallbackCol = (this.table as any)[this.defaultSortColumn as string];
            if (this.isColumn(fallbackCol)) {
                q = q.orderBy(desc(fallbackCol));
            }
        }

        // Pagination
        q = q.limit(this.limit).offset(offset);

        // Strongly type base-table selection
        const data = (await q) as RowOf<TSource>[];

        const total = await this.executeCount(combinedWhere);

        const result: { data: typeof data } & Pagination = {
            data,
            total,
            page: this.page,
            limit: this.limit,
        };
        return result;
    }

    async selectJoined() {
        if (this.groupByExpressions.length) {
            throw new Error('groupBy cannot be used with selectJoined(); use selectFields(...) and aggregate/group your fields');
        }

        const offset = (this.page - 1) * this.limit;
        const combinedWhere = this.wheres.length === 0 ? undefined : this.wheres.length === 1 ? this.wheres[0] : and(...this.wheres);

        // Default select to include base + joined tables in result shape
        let q: any = this.db.select().from(this.table as PgSource);

        for (const j of this.joins) {
            q = j.kind === 'left' ? q.leftJoin(j.table, j.on) : q.innerJoin(j.table, j.on);
        }

        if (combinedWhere) {
            q = q.where(combinedWhere);
        }

        if (this.orderClause) {
            q = q.orderBy(this.orderClause);
        } else if (!this.groupByExpressions.length && this.defaultSortColumn) {
            const fallbackCol = (this.table as any)[this.defaultSortColumn as string];
            if (this.isColumn(fallbackCol)) {
                q = q.orderBy(desc(fallbackCol));
            }
        }

        q = q.limit(this.limit).offset(offset);

        // Drizzle infers the joined result type automatically
        const data = await q;

        const total = await this.executeCount(combinedWhere);

        const result: { data: typeof data } & Pagination = {
            data,
            total,
            page: this.page,
            limit: this.limit,
        };
        return result;
    }

    async selectFields<TSel extends SelectedFields<any, any>>(fields: TSel) {
        if (this.groupByExpressions.length > 0 && this.rootId) {
            throw new Error('groupBy cannot be combined with uniqueOn pagination');
        }

        const offset = (this.page - 1) * this.limit;
        const combinedWhere = this.wheres.length === 0 ? undefined : this.wheres.length === 1 ? this.wheres[0] : and(...this.wheres);

        let q: any = this.db.select(fields).from(this.table as PgSource);
        for (const j of this.joins) {
            q = j.kind === 'left' ? q.leftJoin(j.table, j.on) : q.innerJoin(j.table, j.on);
        }
        if (combinedWhere) {
            q = q.where(combinedWhere);
        }
        if (this.groupByExpressions.length) {
            q = q.groupBy(...this.groupByExpressions);
        }
        if (this.orderClause) {
            q = q.orderBy(this.orderClause);
        } else if (!this.groupByExpressions.length && this.defaultSortColumn) {
            const fallbackCol = (this.table as any)[this.defaultSortColumn as string];
            if (this.isColumn(fallbackCol)) {
                q = q.orderBy(desc(fallbackCol));
            }
        }
        q = q.limit(this.limit).offset(offset);

        const data = await q;

        const total = await this.executeCount(combinedWhere);

        const result: { data: typeof data } & Pagination = {
            data,
            total,
            page: this.page,
            limit: this.limit,
        };
        return result;
    }

    private async executeCount(combinedWhere: SQL | undefined) {
        if (this.groupByExpressions.length) {
            let groupedQuery: any = this.db.select({ __group__: sql<number>`1` }).from(this.table as PgSource);

            for (const j of this.joins) {
                groupedQuery = j.kind === 'left' ? groupedQuery.leftJoin(j.table, j.on) : groupedQuery.innerJoin(j.table, j.on);
            }

            if (combinedWhere) {
                groupedQuery = groupedQuery.where(combinedWhere);
            }

            groupedQuery = groupedQuery.groupBy(...this.groupByExpressions);

            const grouped = groupedQuery.as('grouped_counts');
            const [{ count } = { count: 0 }] = await this.db.select({ count: sql<number>`count(*)` }).from(grouped);

            return Number(count ?? 0);
        }

        const countExpr = this.countDistinctOn ? sql<number>`count(distinct ${this.countDistinctOn})` : sql<number>`count(*)`;

        let cq: any = this.db.select({ count: countExpr }).from(this.table as PgSource);

        for (const j of this.joins) {
            cq = j.kind === 'left' ? cq.leftJoin(j.table, j.on) : cq.innerJoin(j.table, j.on);
        }

        if (combinedWhere) cq = cq.where(combinedWhere);

        const [{ count }] = await cq;
        return Number(count);
    }

    // Helpers
    private isColumn(value: unknown): value is DrizzleColumn {
        return !!value && typeof value === 'object' && 'dataType' in (value as any);
    }

    private resolveGroupByExpression(column: string | DrizzleColumn | SQL): DrizzleColumn | SQL {
        if (typeof column === 'string') {
            const resolved = (this.table as any)?.[column];
            if (!resolved) {
                throw new Error(`Group by column '${column}' not found on source table. For joined table columns, pass the column object directly instead of a string!`);
            }
            return resolved as DrizzleColumn | SQL;
        }
        return column;
    }

    private getFirstColumnKey(): string {
        for (const key of Object.keys(this.table)) {
            const maybe = (this.table as any)[key];
            if (this.isColumn(maybe)) return key;
        }
        return Object.keys(this.table)[0];
    }
}
