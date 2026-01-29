import { Injectable } from '@nestjs/common';
import { FilterService } from '@/common/services/filter.service';
import { AnyPgTable, PgView, PgViewWithSelection } from 'drizzle-orm/pg-core';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { FilterableQueryBuilder } from './filterable-query.builder';

@Injectable()
export abstract class BaseFilterableService {
    constructor(protected readonly filterService: FilterService) {}

    protected filterable<T extends AnyPgTable | PgView | PgViewWithSelection>(
        db: NodePgDatabase<any>,
        table: T,
        options?: {
            defaultSortColumn?: string | any;
            countDistinctOn?: any; // pass Schema.table.id if joins can duplicate rows
        },
    ) {
        return new FilterableQueryBuilder(db, table, this.filterService, options);
    }
}
