import { ExtractValues } from '@/types';

export function flattenPermissions<T extends Record<string, any>>(obj: T): ExtractValues<T>[] {
    const result: string[] = [];

    const walk = (o: any) => {
        Object.values(o).forEach((val) => {
            if (typeof val === 'string') {
                result.push(val);
            } else if (val && typeof val === 'object') {
                walk(val);
            }
        });
    };

    walk(obj);

    return result as ExtractValues<T>[];
}
