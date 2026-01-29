export type FilterOperator =
    | 'iLike'
    | 'notILike'
    | 'eq'
    | 'ne'
    | 'inArray'
    | 'notInArray'
    | 'isEmpty'
    | 'isNotEmpty'
    | 'lt'
    | 'lte'
    | 'gt'
    | 'gte'
    | 'isBetween'
    | 'isRelativeToToday';

export type FilterVariant = 'text' | 'number' | 'range' | 'date' | 'dateRange' | 'boolean' | 'select' | 'multiSelect';

export type JoinOperator = 'and' | 'or';

export interface ColumnFilter {
    id: string;
    operator: FilterOperator;
    value: string | string[];
    variant: FilterVariant;
    joinOperator?: JoinOperator;
}
