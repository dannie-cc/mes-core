import { Permissions } from '@/common/permissions';

export type ExtractValues<T> = T extends Record<string, infer V> ? ExtractValues<V> : T;

export type Permission = ExtractValues<typeof Permissions>;
