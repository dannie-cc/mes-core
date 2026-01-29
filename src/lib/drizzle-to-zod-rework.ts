/* eslint-disable @typescript-eslint/ban-ts-comment */
// drizzle-zod-v4.ts
// Zod v4-compatible Drizzle -> Zod schema mappers.
// Usage:
//   const insertSchema = createInsertSchema(myTable)
//   const selectSchema = createSelectSchema(myTable)
//   const updateSchema = createUpdateSchema(myTable)
//
// Notes:
// - Fully supports Zod v4 (top-level format helpers like z.uuid(), z.email(), z.ipv6(), etc.).
// - Preserves drizzle-zod logic for numeric bounds, bigint ranges, arrays, geometry, vectors, enums.
// - Handles select/insert/update optional/nullable/never rules.
// - Optional injection of a specific Zod instance via the third parameter or via createSchemaFactory().
// - Types updated for Zod v4 (no 'strip' generic on ZodObject).

import {
    isTable,
    getTableColumns,
    getViewSelectedFields,
    is,
    Column,
    SQL,
    isView,
    type Assume,
    type SelectedFieldsFlat,
    type Simplify,
    type Table,
    type View,
    type DrizzleTypeError,
} from 'drizzle-orm';
import type { PgEnum } from 'drizzle-orm/pg-core';
import * as zDefault from 'zod';

// ---------------------------------------------
// Options, helpers, constants
// ---------------------------------------------

export interface CreateSchemaFactoryOptions {
    zodInstance?: typeof zDefault | any;
    coerce?: true | Partial<Record<'bigint' | 'boolean' | 'date' | 'number' | 'string', true>>;
}

function resolveZ(options?: CreateSchemaFactoryOptions) {
    return (options?.zodInstance as typeof zDefault) ?? zDefault;
}

export const CONSTANTS = {
    INT8_MIN: -128,
    INT8_MAX: 127,
    INT8_UNSIGNED_MAX: 255,
    INT16_MIN: -32768,
    INT16_MAX: 32767,
    INT16_UNSIGNED_MAX: 65535,
    INT24_MIN: -8388608,
    INT24_MAX: 8388607,
    INT24_UNSIGNED_MAX: 16777215,
    INT32_MIN: -2147483648,
    INT32_MAX: 2147483647,
    INT32_UNSIGNED_MAX: 4294967295,
    INT48_MIN: -140737488355328,
    INT48_MAX: 140737488355327,
    INT48_UNSIGNED_MAX: 281474976710655,
    INT64_MIN: -9223372036854775808n,
    INT64_MAX: 9223372036854775807n,
    INT64_UNSIGNED_MAX: 18446744073709551615n,
} as const;

export function isColumnType<T extends Column>(column: Column, columnTypes: string[]): column is T {
    return columnTypes.includes((column as any).columnType);
}

export function isWithEnum(column: Column): column is typeof column & { enumValues: [string, ...string[]] } {
    return 'enumValues' in (column as any) && Array.isArray((column as any).enumValues) && (column as any).enumValues.length > 0;
}

export const isPgEnum = (entity: any): entity is PgEnum<[string, ...string[]]> => entity && Array.isArray(entity.enumValues) && entity.enumValues.length > 0;

// ---------------------------------------------
// JSON / Buffer schemas (built with a given z)
// ---------------------------------------------

function getLiteralSchema(z: typeof zDefault) {
    return z.union([z.string(), z.number(), z.boolean(), z.null()]);
}

export type Json = zDefault.infer<ReturnType<typeof getLiteralSchema>> | { [key: string]: any } | any[];

function getJsonSchema(z: typeof zDefault): zDefault.ZodType<Json> {
    return z.union([getLiteralSchema(z), z.record(z.any(), z.any()), z.array(z.any())]);
}

function getBufferSchema(z: typeof zDefault): zDefault.ZodType<Buffer> {
    return typeof Buffer !== 'undefined' && typeof (Buffer as any).isBuffer === 'function'
        ? z.custom<Buffer>((v) => (Buffer as any).isBuffer(v) === true)
        : z.custom<Buffer>(() => false);
}

// ---------------------------------------------
// Column -> Zod schema
// ---------------------------------------------

export function columnToSchema(column: Column, factory: CreateSchemaFactoryOptions | undefined): zDefault.ZodTypeAny {
    const z = resolveZ(factory);
    const coerce = factory?.coerce ?? {};

    // Enums
    if (isWithEnum(column)) {
        const values = (column as any).enumValues as readonly [string, ...string[]] | string[];
        return values && values.length ? (z.enum as any)(values as any) : z.string();
    }

    // Geometry / vector-like
    if (isColumnType(column, ['PgGeometry', 'PgPointTuple'])) {
        return z.tuple([z.number(), z.number()]);
    }
    if (isColumnType(column, ['PgGeometryObject', 'PgPointObject'])) {
        return z.object({ x: z.number(), y: z.number() });
    }
    if (isColumnType(column, ['PgHalfVector', 'PgVector'])) {
        const dims = (column as any).dimensions as number | undefined;
        let arr = z.array(z.number());
        return typeof dims === 'number' ? (arr as any).length(dims) : arr;
    }
    if (isColumnType(column, ['PgLine'])) {
        return z.tuple([z.number(), z.number(), z.number()]);
    }
    if (isColumnType(column, ['PgLineABC'])) {
        return z.object({ a: z.number(), b: z.number(), c: z.number() });
    }

    // Arrays
    if (isColumnType(column, ['PgArray'])) {
        const baseCol: Column | undefined = (column as any).baseColumn;
        const size: number | undefined = (column as any).size;
        const baseSchema = baseCol ? columnToSchema(baseCol, factory) : z.any();
        let arr = z.array(baseSchema);
        return typeof size === 'number' ? (arr as any).length(size) : arr;
    }

    const dataType: string = (column as any).dataType;

    switch (dataType) {
        case 'array':
            return z.array(z.any());

        case 'number':
            return numberColumnToSchema(column, z, coerce);

        case 'bigint':
            return bigintColumnToSchema(column, z, coerce);

        case 'boolean':
            return coerce === true || (coerce as any).boolean ? z.coerce.boolean() : z.boolean();

        case 'date':
            return coerce === true || (coerce as any).date ? z.coerce.date() : z.date();

        case 'string':
            return stringColumnToSchema(column, z, coerce);

        case 'json':
            return getJsonSchema(z) as any;

        case 'custom':
            return z.any();

        case 'buffer':
            return getBufferSchema(z) as any;

        default:
            return z.any();
    }
}

function numberColumnToSchema(column: Column, z: typeof zDefault, coerce: CreateSchemaFactoryOptions['coerce']) {
    let unsigned = String((column as any).getSQLType?.() ?? (column as any).sqlType ?? '').includes('unsigned');
    let min: number;
    let max: number;
    let integer = false;

    if (isColumnType(column, ['MySqlTinyInt', 'SingleStoreTinyInt'])) {
        min = unsigned ? 0 : CONSTANTS.INT8_MIN;
        max = unsigned ? CONSTANTS.INT8_UNSIGNED_MAX : CONSTANTS.INT8_MAX;
        integer = true;
    } else if (isColumnType(column, ['PgSmallInt', 'PgSmallSerial', 'MySqlSmallInt', 'SingleStoreSmallInt'])) {
        min = unsigned ? 0 : CONSTANTS.INT16_MIN;
        max = unsigned ? CONSTANTS.INT16_UNSIGNED_MAX : CONSTANTS.INT16_MAX;
        integer = true;
    } else if (isColumnType(column, ['PgReal', 'MySqlFloat', 'MySqlMediumInt', 'SingleStoreMediumInt', 'SingleStoreFloat'])) {
        min = unsigned ? 0 : CONSTANTS.INT24_MIN;
        max = unsigned ? CONSTANTS.INT24_UNSIGNED_MAX : CONSTANTS.INT24_MAX;
        integer = isColumnType(column, ['MySqlMediumInt', 'SingleStoreMediumInt']);
    } else if (isColumnType(column, ['PgInteger', 'PgSerial', 'MySqlInt', 'SingleStoreInt'])) {
        min = unsigned ? 0 : CONSTANTS.INT32_MIN;
        max = unsigned ? CONSTANTS.INT32_UNSIGNED_MAX : CONSTANTS.INT32_MAX;
        integer = true;
    } else if (isColumnType(column, ['PgDoublePrecision', 'MySqlReal', 'MySqlDouble', 'SingleStoreReal', 'SingleStoreDouble', 'SQLiteReal'])) {
        min = unsigned ? 0 : CONSTANTS.INT48_MIN;
        max = unsigned ? CONSTANTS.INT48_UNSIGNED_MAX : CONSTANTS.INT48_MAX;
    } else if (isColumnType(column, ['PgBigInt53', 'PgBigSerial53', 'MySqlBigInt53', 'MySqlSerial', 'SingleStoreBigInt53', 'SingleStoreSerial', 'SQLiteInteger'])) {
        unsigned = unsigned || isColumnType(column, ['MySqlSerial', 'SingleStoreSerial']) || false;
        min = unsigned ? 0 : Number.MIN_SAFE_INTEGER;
        max = Number.MAX_SAFE_INTEGER;
        integer = true;
    } else if (isColumnType(column, ['MySqlYear', 'SingleStoreYear'])) {
        min = 1901;
        max = 2155;
        integer = true;
    } else {
        min = Number.MIN_SAFE_INTEGER;
        max = Number.MAX_SAFE_INTEGER;
    }

    let schema = coerce === true || (coerce as any)?.number ? z.coerce.number() : z.number();
    schema = schema.min(min).max(max);
    return integer ? (schema as any).int() : schema;
}

function bigintColumnToSchema(column: Column, z: typeof zDefault, coerce: CreateSchemaFactoryOptions['coerce']) {
    const unsigned = String((column as any).getSQLType?.() ?? (column as any).sqlType ?? '').includes('unsigned');
    const min = unsigned ? 0n : CONSTANTS.INT64_MIN;
    const max = unsigned ? CONSTANTS.INT64_UNSIGNED_MAX : CONSTANTS.INT64_MAX;
    const schema = coerce === true || (coerce as any)?.bigint ? z.coerce.bigint() : z.bigint();
    return schema.min(min).max(max);
}

function stringColumnToSchema(column: Column, z: typeof zDefault, coerce: CreateSchemaFactoryOptions['coerce']) {
    // UUID (prefer top-level Zod v4 API)
    if (isColumnType(column, ['PgUUID'])) {
        const top = (z as any).uuid;
        return typeof top === 'function' ? top() : z.string().uuid();
    }

    let max: number | undefined;
    let regex: RegExp | undefined;
    let fixed = false;

    if (isColumnType(column, ['PgVarchar', 'SQLiteText'])) {
        max = (column as any).length;
    } else if (isColumnType(column, ['MySqlVarChar', 'SingleStoreVarChar'])) {
        max = (column as any).length ?? CONSTANTS.INT16_UNSIGNED_MAX;
    } else if (isColumnType(column, ['MySqlText', 'SingleStoreText'])) {
        const textType: string | undefined = (column as any).textType;
        if (textType === 'longtext') max = CONSTANTS.INT32_UNSIGNED_MAX;
        else if (textType === 'mediumtext') max = CONSTANTS.INT24_UNSIGNED_MAX;
        else if (textType === 'text') max = CONSTANTS.INT16_UNSIGNED_MAX;
        else max = CONSTANTS.INT8_UNSIGNED_MAX;
    }

    if (isColumnType(column, ['PgChar', 'MySqlChar', 'SingleStoreChar'])) {
        max = (column as any).length;
        fixed = true;
    }

    if (isColumnType(column, ['PgBinaryVector'])) {
        const dimensions = (column as any).dimensions as number | undefined;
        regex = /^[01]+$/;
        max = dimensions;
    }

    let schema = coerce === true || (coerce as any)?.string ? z.coerce.string() : z.string();
    schema = regex ? schema.regex(regex) : schema;
    if (max && fixed) return (schema as any).length(max);
    if (max) return schema.max(max);
    return schema;
}

// ---------------------------------------------
// Schema building over columns (select/insert/update)
// ---------------------------------------------

function getColumns(tableLike: any) {
    return isTable(tableLike) ? getTableColumns(tableLike) : getViewSelectedFields(tableLike);
}

export interface Conditions {
    never: (column?: Column) => boolean;
    optional: (column: Column) => boolean;
    nullable: (column: Column) => boolean;
}

const selectConditions: Conditions = {
    never: () => false,
    optional: () => false,
    nullable: (column) => !(column as any).notNull,
};

const insertConditions: Conditions = {
    never: (column) => ((column as any)?.generated?.type === 'always' || (column as any)?.generatedIdentity?.type === 'always') ?? false,
    optional: (column) => {
        const notNull = !!(column as any).notNull;
        const hasDefault = !!(column as any).hasDefault;
        return !notNull || (notNull && hasDefault);
    },
    nullable: (column) => !(column as any).notNull,
};

const updateConditions: Conditions = {
    never: (column) => ((column as any)?.generated?.type === 'always' || (column as any)?.generatedIdentity?.type === 'always') ?? false,
    optional: () => true,
    nullable: (column) => !(column as any).notNull,
};

function handleColumns(columns: Record<string, any>, refinements: Record<string, any>, conditions: Conditions, factory?: CreateSchemaFactoryOptions) {
    const z = resolveZ(factory);
    const columnSchemas: Record<string, zDefault.ZodTypeAny> = {};

    for (const [key, selected] of Object.entries(columns)) {
        if (!is(selected, Column) && !is(selected, SQL) && !is(selected, (SQL as any).Aliased) && typeof selected === 'object') {
            const nested = isTable(selected) || isView(selected) ? getColumns(selected) : selected;
            const inner = handleColumns(nested, (refinements as any)[key] ?? {}, conditions, factory);
            columnSchemas[key] = inner;
            continue;
        }

        const refinement = refinements[key];

        if (refinement !== undefined && typeof refinement !== 'function') {
            columnSchemas[key] = refinement;
            continue;
        }

        const col = is(selected, Column) ? (selected as Column) : undefined;
        const baseSchema = col ? columnToSchema(col, factory) : z.any();
        const refined = typeof refinement === 'function' ? refinement(baseSchema) : baseSchema;

        if (conditions.never(col)) {
            continue;
        }

        let finalSchema = refined;

        if (col && conditions.nullable(col)) {
            finalSchema = finalSchema.nullable();
        }
        if (col && conditions.optional(col)) {
            finalSchema = finalSchema.optional();
        }

        columnSchemas[key] = finalSchema;
    }

    return resolveZ(factory).object(columnSchemas);
}

// ---------------------------------------------
// Public creators (with optional options param)
// ---------------------------------------------

function handleEnum<TEnum extends PgEnum<any>>(enum_: TEnum, options?: CreateSchemaFactoryOptions) {
    const z = resolveZ(options);
    return (z.enum as any)(enum_.enumValues) as zDefault.ZodEnum<TEnum['enumValues']>;
}

// Types for the public API (Zod v4)
export interface CreateSelectSchema {
    <TTable extends Table>(
        table: TTable,
        refine?: NoUnknownKeys<BuildRefine<Pick<TTable['_']['columns'], keyof TTable['$inferSelect']>>, TTable['$inferSelect']>,
        options?: CreateSchemaFactoryOptions,
    ): BuildSchema<'select', TTable['_']['columns'], typeof refine>;
    <TView extends View>(
        view: TView,
        refine?: NoUnknownKeys<BuildRefine<Pick<TView['_']['selectedFields'], keyof TView['$inferSelect']>>, TView['$inferSelect']>,
        options?: CreateSchemaFactoryOptions,
    ): BuildSchema<'select', TView['_']['selectedFields'], typeof refine>;
    <TEnum extends PgEnum<any>>(enum_: TEnum, refine?: undefined, options?: CreateSchemaFactoryOptions): zDefault.ZodEnum<TEnum['enumValues']>;
}

export interface CreateInsertSchema {
    <TTable extends Table>(
        table: TTable,
        refine?: NoUnknownKeys<BuildRefine<Pick<TTable['_']['columns'], keyof TTable['$inferInsert']>>, TTable['$inferInsert']>,
        options?: CreateSchemaFactoryOptions,
    ): BuildSchema<'insert', TTable['_']['columns'], typeof refine>;
}

export interface CreateUpdateSchema {
    <TTable extends Table>(
        table: TTable,
        refine?: BuildRefine<Pick<TTable['_']['columns'], keyof TTable['$inferInsert']>>,
        options?: CreateSchemaFactoryOptions,
    ): BuildSchema<'update', TTable['_']['columns'], typeof refine>;
}

// @ts-ignore
export const createSelectSchema: CreateSelectSchema = (entity: any, refine?: Record<string, any>, options?: CreateSchemaFactoryOptions) => {
    if (isPgEnum(entity)) {
        return handleEnum(entity, options);
    }
    const columns = getColumns(entity);
    return handleColumns(columns, refine ?? {}, selectConditions, options) as any;
};

export const createInsertSchema: CreateInsertSchema = (entity: any, refine?: Record<string, any>, options?: CreateSchemaFactoryOptions) => {
    const columns = getColumns(entity);
    return handleColumns(columns, refine ?? {}, insertConditions, options) as any;
};

export const createUpdateSchema: CreateUpdateSchema = (entity: any, refine?: Record<string, any>, options?: CreateSchemaFactoryOptions) => {
    const columns = getColumns(entity);
    return handleColumns(columns, refine ?? {}, updateConditions, options) as any;
};

export function createSchemaFactory(options?: CreateSchemaFactoryOptions) {
    const merged = options ?? {};
    const createSelectSchemaWith = ((entity: any, refine?: any) => createSelectSchema(entity, refine, merged)) as CreateSelectSchema;
    const createInsertSchemaWith = ((entity: any, refine?: any) => createInsertSchema(entity, refine, merged)) as CreateInsertSchema;
    const createUpdateSchemaWith = ((entity: any, refine?: any) => createUpdateSchema(entity, refine, merged)) as CreateUpdateSchema;

    return {
        createSelectSchema: createSelectSchemaWith,
        createInsertSchema: createInsertSchemaWith,
        createUpdateSchema: createUpdateSchemaWith,
    };
}

// ---------------------------------------------
// Type-level API (mirrors original drizzle-zod intent)
// Updated for Zod v4 (no 'strip' generic on ZodObject).
// ---------------------------------------------

export type IsNever<T> = [T] extends [never] ? true : false;
type Mutable<T> = { -readonly [K in keyof T]: T[K] };

export type ArrayHasAtLeastOneValue<TEnum extends readonly [any, ...any[]] | undefined> = TEnum extends readonly [any, ...any[]] ? true : false;

export type ColumnIsGeneratedAlwaysAs<TColumn extends Column> = TColumn['_']['identity'] extends 'always'
    ? true
    : TColumn['_']['generated'] extends undefined
    ? false
    : TColumn['_']['generated'] extends infer TGenerated extends {
        type: string;
    }
    ? TGenerated['type'] extends 'byDefault'
    ? false
    : true
    : true;

export type RemoveNever<T> = {
    [K in keyof T as T[K] extends never ? never : K]: T[K];
};

export type GetSelection<T extends SelectedFieldsFlat<Column> | Table | View> = T extends Table ? T['_']['columns'] : T extends View ? T['_']['selectedFields'] : T;

export type GetEnumValuesFromColumn<TColumn extends Column> = TColumn['_'] extends { enumValues: infer TVals }
    ? TVals extends readonly [infer E, ...infer _R]
    ? E extends string
    ? TVals
    : undefined
    : undefined
    : undefined;

export type GetBaseColumn<TColumn extends Column> = TColumn['_'] extends { baseColumn: Column | never | undefined }
    ? IsNever<TColumn['_']['baseColumn']> extends false
    ? TColumn['_']['baseColumn']
    : undefined
    : undefined;

export type GetZodType<
    TData,
    TDataType extends string,
    TColumnType extends string,
    TEnumValues extends [string, ...string[]] | undefined,
    TBaseColumn extends Column | undefined,
> = TBaseColumn extends Column
    ? zDefault.ZodArray<
        GetZodType<TBaseColumn['_']['data'], TBaseColumn['_']['dataType'], TBaseColumn['_']['columnType'], GetEnumValuesFromColumn<TBaseColumn>, GetBaseColumn<TBaseColumn>>
    >
    : ArrayHasAtLeastOneValue<TEnumValues> extends true
    ? zDefault.ZodType<TData>
    : TData extends infer TTuple extends [any, ...any[]]
    ? zDefault.ZodTuple<
        Assume<
            {
                [K in keyof TTuple]: GetZodType<TTuple[K], string, string, undefined, undefined>;
            },
            [any, ...any[]]
        >
    >
    : TData extends Date
    ? zDefault.ZodDate
    : TData extends Buffer
    ? zDefault.ZodType<Buffer>
    : TDataType extends 'array'
    ? zDefault.ZodArray<GetZodType<Assume<TData, any[]>[number], string, string, undefined, undefined>>
    : TData extends infer TDict extends Record<string, any>
    ? TColumnType extends 'PgJson' | 'PgJsonb' | 'MySqlJson' | 'SingleStoreJson' | 'SQLiteTextJson' | 'SQLiteBlobJson'
    // @ts-ignore
    ? zDefault.ZodType<TDict, any, TDict>
    : zDefault.ZodObject<{
        [K in keyof TDict]: GetZodType<TDict[K], string, string, undefined, undefined>;
    }>
    : TDataType extends 'json'
    ? zDefault.ZodType<Json>
    : TData extends number
    ? zDefault.ZodNumber
    : TData extends bigint
    ? zDefault.ZodBigInt
    : TData extends boolean
    ? zDefault.ZodBoolean
    : TData extends string
    ? zDefault.ZodString
    : zDefault.ZodTypeAny;

type HandleSelectColumn<TSchema extends zDefault.ZodTypeAny, TColumn extends Column> = TColumn['_']['notNull'] extends true ? TSchema : zDefault.ZodNullable<TSchema>;

type HandleInsertColumn<TSchema extends zDefault.ZodTypeAny, TColumn extends Column> =
    ColumnIsGeneratedAlwaysAs<TColumn> extends true
    ? never
    : TColumn['_']['notNull'] extends true
    ? TColumn['_']['hasDefault'] extends true
    ? zDefault.ZodOptional<TSchema>
    : TSchema
    : zDefault.ZodOptional<zDefault.ZodNullable<TSchema>>;

type HandleUpdateColumn<TSchema extends zDefault.ZodTypeAny, TColumn extends Column> =
    ColumnIsGeneratedAlwaysAs<TColumn> extends true
    ? never
    : TColumn['_']['notNull'] extends true
    ? zDefault.ZodOptional<TSchema>
    : zDefault.ZodOptional<zDefault.ZodNullable<TSchema>>;

export type HandleColumn<TType extends 'select' | 'insert' | 'update', TColumn extends Column> =
    GetZodType<TColumn['_']['data'], TColumn['_']['dataType'], TColumn['_']['columnType'], GetEnumValuesFromColumn<TColumn>, GetBaseColumn<TColumn>> extends infer TSchema extends
    zDefault.ZodTypeAny
    ? TSchema extends zDefault.ZodAny
    ? zDefault.ZodAny
    : TType extends 'select'
    ? HandleSelectColumn<TSchema, TColumn>
    : TType extends 'insert'
    ? HandleInsertColumn<TSchema, TColumn>
    : TType extends 'update'
    ? HandleUpdateColumn<TSchema, TColumn>
    : TSchema
    : zDefault.ZodAny;

export type BuildRefineColumns<TColumns extends Record<string, any>> = Simplify<
    RemoveNever<{
        [K in keyof TColumns]: TColumns[K] extends infer TColumn extends Column
        ? GetZodType<
            TColumn['_']['data'],
            TColumn['_']['dataType'],
            TColumn['_']['columnType'],
            GetEnumValuesFromColumn<TColumn>,
            GetBaseColumn<TColumn>
        > extends infer TSchema extends zDefault.ZodTypeAny
        ? TSchema
        : zDefault.ZodAny
        : TColumns[K] extends infer TObject extends SelectedFieldsFlat<Column> | Table | View
        ? BuildRefineColumns<GetSelection<TObject>>
        : TColumns[K];
    }>
>;

export type BuildRefine<TColumns extends Record<string, any>> =
    BuildRefineColumns<TColumns> extends infer TBuildColumns
    ? {
        [K in keyof TBuildColumns]?: TBuildColumns[K] extends zDefault.ZodTypeAny
        ? ((schema: TBuildColumns[K]) => zDefault.ZodTypeAny) | zDefault.ZodTypeAny
        : TBuildColumns[K] extends Record<string, any>
        ? Simplify<BuildRefine<TBuildColumns[K]>>
        : never;
    }
    : never;

type HandleRefinement<
    TType extends 'select' | 'insert' | 'update',
    TRefinement extends zDefault.ZodTypeAny | ((schema: zDefault.ZodTypeAny) => zDefault.ZodTypeAny),
    TColumn extends Column,
> = TRefinement extends (schema: any) => zDefault.ZodTypeAny
    ? (TColumn['_']['notNull'] extends true ? ReturnType<TRefinement> : zDefault.ZodNullable<ReturnType<TRefinement>>) extends infer TSchema
    ? TType extends 'update'
    ? zDefault.ZodOptional<Assume<TSchema, zDefault.ZodTypeAny>>
    : TSchema
    : zDefault.ZodTypeAny
    : TRefinement;

type IsRefinementDefined<TRefinements, TKey extends string> = TKey extends keyof TRefinements
    ? TRefinements[TKey] extends zDefault.ZodTypeAny | ((schema: any) => any)
    ? true
    : false
    : false;

export type BuildSchema<
    TType extends 'select' | 'insert' | 'update',
    TColumns extends Record<string, any>,
    TRefinements extends Record<string, any> | undefined,
> = zDefault.ZodObject<
    Simplify<
        RemoveNever<{
            [K in keyof TColumns]: TColumns[K] extends infer TColumn extends Column
            ? TRefinements extends object
            ? IsRefinementDefined<TRefinements, Assume<K, string>> extends true
            ? HandleRefinement<TType, TRefinements[Assume<K, keyof TRefinements>], TColumn>
            : HandleColumn<TType, TColumn>
            : HandleColumn<TType, TColumn>
            : TColumns[K] extends infer TObject extends SelectedFieldsFlat<Column> | Table | View
            ? BuildSchema<
                TType,
                GetSelection<TObject>,
                TRefinements extends object ? (TRefinements[Assume<K, keyof TRefinements>] extends infer TNested extends object ? TNested : undefined) : undefined
            >
            : zDefault.ZodAny;
        }>
    >
>;

export type NoUnknownKeys<TRefinement extends Record<string, any>, TCompare extends Record<string, any>> = {
    [K in keyof TRefinement]: K extends keyof TCompare
    ? TRefinement[K] extends Record<string, zDefault.ZodTypeAny>
    ? NoUnknownKeys<TRefinement[K], TCompare[K]>
    : TRefinement[K]
    : DrizzleTypeError<`Found unknown key in refinement: "${K & string}"`>;
};

// ---------------------------------------------
// Export helpful primitives if you need them directly
// ---------------------------------------------

export const literalSchema = getLiteralSchema(zDefault);
export const jsonSchema = getJsonSchema(zDefault);
export const bufferSchema = getBufferSchema(zDefault);
