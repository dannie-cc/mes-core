/**
 * A utility class for object methods.
 */
export class ObjectUtils {
    /**
     * Checks if an object is empty.
     * @param obj The object to check.
     * @returns True if the object is empty, false otherwise.
     */
    static isEmpty(obj: Record<string, any>): boolean {
        return Object.keys(obj).length === 0 && obj.constructor === Object;
    }

    /**
     * Creates a new object composed of the specified keys from the input object.
     *
     * @template T - The type of the source object.
     * @template K - The union of keys to pick from the source object.
     *
     * @param obj - The source object to pick properties from.
     * @param keys - An array of keys to pick.
     *
     * @returns A new object containing only the picked properties.
     *
     * @example
     * ```typescript
     * const user = { id: 1, name: 'Amin', email: 'amin@example.com' };
     * const result = pick(user, ['id', 'name']);
     * // result: { id: 1, name: 'Amin' }
     * ```
     */
    static pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
        const result = {} as Pick<T, K>;
        keys.forEach((key) => {
            if (key in obj) {
                result[key] = obj[key];
            }
        });
        return result;
    }

    /**
     * Creates a new object by omitting the specified keys from the input object.
     *
     * @template T - The type of the source object.
     * @template K - The union of keys to omit from the source object.
     *
     * @param obj - The source object to omit properties from.
     * @param keysToOmit - An array of keys to omit.
     *
     * @returns A new object containing all properties except the omitted ones.
     *
     * @example
     * ```typescript
     * const user = { id: 1, name: 'Amin', email: 'amin@example.com' };
     * const result = ObjectUtils.omit(user, ['email']);
     * // result: { id: 1, name: 'Amin' }
     * ```
     */
    static omit<T extends object, K extends keyof T>(obj: T, keysToOmit: K[]): Omit<T, K> {
        const result = {
            ...obj,
        }; // Start with a shallow copy of the object
        keysToOmit.forEach((key) => {
            delete result[key];
        });
        return result;
    }
}
