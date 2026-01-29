/**
 * A utility class for array methods.
 */
export class ArrayUtils {
    /**
     * Sanitizes an array by removing all `null` values.
     *
     * This utility function takes an array that may include `null` values or be `null` itself,
     * and returns a new array containing only the non-`null` elements.
     *
     * @template T - The type of elements in the array.
     * @param inputArray - The array to sanitize. It can include `null` elements or be `null`.
     * @returns A new array with all `null` elements removed. If the input is `null`, an empty array is returned.
     *
     * @example
     * ```typescript
     * const inputArray = [null, undefined, 1, 2, null, 3];
     * const result = ArrayUtils.sanitizeArray(inputArray);
     * console.log(result); // Output: [1, 2, 3]
     * ```
     *
     * @example
     * ```typescript
     * const inputArray: (string | null)[] | null = [null, "a", null, "b"];
     * const result = sanitizeArray(inputArray);
     * console.log(result); // Output: ["a", "b"]
     * ```
     */
    static sanitizeArray<T>(inputArray: (T | null | undefined)[] | null | undefined): T[] {
        if (!inputArray) return [];
        return inputArray.filter((item): item is T => item !== null && item !== undefined);
    }

    /**
     * Compares two arrays of strings to determine if they contain the same elements, regardless of order.
     *
     * This function considers two arrays to be equal if:
     * 1. Both are `undefined` or `null`, or
     * 2. They have the same length and elements, regardless of the order of those elements.
     *
     * Case-insensitive comparison is applied to the string elements.
     *
     * @param arr1 - The first array of strings to compare, which can be undefined or null.
     * @param arr2 - The second array of strings to compare, which can be undefined or null.
     *
     * @returns `true` if both arrays are equal or both are undefined; `false` otherwise.
     *
     * @example
     * ```ts
     * compareArray(['apple', 'Banana'], ['banana', 'Apple']); // true
     * compareArray(['apple'], ['banana']); // false
     * compareArray(undefined, undefined); // true
     * ```
     */
    static compareArray(arr1?: string[] | null | undefined, arr2?: string[] | null | undefined): boolean {
        if (!arr1 && !arr2) return true;
        if (!arr1 || !arr2) return false;
        if (arr1.length !== arr2.length) return false;

        const sortedArr1 = [...arr1].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
        const sortedArr2 = [...arr2].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
        return sortedArr1.every((value, index) => value.localeCompare(sortedArr2[index], undefined, { sensitivity: 'base' }) === 0);
    }

    /**
     * Compares multiple arrays of strings to determine if they all contain the same elements, regardless of order.
     *
     * This function considers arrays to be equal if:
     * 1. All arrays are `undefined` or `null`, or
     * 2. They have the same length and elements, regardless of the order of those elements.
     *
     * Case-insensitive comparison is applied to the string elements.
     *
     * @param arrays - An arbitrary number of arrays to compare, each can be undefined or null.
     *
     * @returns `true` if all arrays are equal, or if all arrays are undefined; `false` otherwise.
     *
     * @example
     * ```ts
     * compareArrays(['apple', 'Banana'], ['banana', 'Apple'], ['Banana', 'apple']); // true
     * compareArrays(['apple'], ['banana'], ['apple']); // false
     * compareArrays(undefined, undefined); // true
     * ```
     */
    static compareArrays(...arrays: (string[] | null | undefined)[]): boolean {
        const definedArrays = arrays.filter((arr) => arr !== undefined && arr !== null);
        if (definedArrays.length === 0) return true;

        const firstArray = definedArrays[0];
        if (!definedArrays.every((arr) => arr!.length === firstArray!.length)) return false;

        const sortedFirstArray = [...firstArray!].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
        return definedArrays.every((arr) => {
            const sortedArr = [...arr!].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
            return sortedArr.every((value, index) => value.localeCompare(sortedFirstArray[index], undefined, { sensitivity: 'base' }) === 0);
        });
    }

    /**
     * Checks if an element is the only element in the array.
     * @template T - The type of the elements in the array.
     * @param {T[]} baseArray - The array to check.
     * @param {T} element - The element to check for.
     * @returns {boolean} - `true` if the `baseArray` contains exactly one element that matches `element`; otherwise, `false`.
     */
    static onlyIncludes<T>(baseArray: T[], element: T): boolean {
        return baseArray.length === 1 && baseArray[0] === element;
    }

    /**
     * Checks if none of the elements in the provided array are included in the base array.
     *
     * @template T The type of elements in the arrays.
     * @param {T[]} baseArray The array to check against.
     * @param {T[]} elements The array of elements to check for exclusion.
     * @returns {boolean} Returns `true` if none of the elements are included in the base array, otherwise `false`.
     *
     * @example
     * ```
     * const baseArray = [1, 2, 3, 4, 5];
     * const elementsToCheck = [6, 7];
     * const result = YourClass.notIncludes(baseArray, elementsToCheck);
     * console.log(result); // true, because neither 6 nor 7 are in the baseArray
     *
     * const elementsToCheck2 = [5, 6];
     * const result2 = YourClass.notIncludes(baseArray, elementsToCheck2);
     * console.log(result2); // false, because 5 is found in the baseArray
     * ```
     */
    static notIncludes<T>(baseArray: T[], elements: T[]): boolean {
        const elementsSet = new Set(elements);
        return !baseArray.some((element) => elementsSet.has(element));
    }

    /**
     * Checks if any of the elements in the provided array are included in the base array.
     *
     * @template T The type of elements in the arrays.
     * @param {T[]} baseArray The array to check against.
     * @param {T[]} elements The array of elements to check for inclusion.
     * @returns {boolean} Returns `true` if at least one of the elements is included in the base array, otherwise `false`.
     *
     * @example
     * ```
     * const baseArray = [1, 2, 3, 4, 5];
     * const elementsToCheck = [5, 6];
     * const result = YourClass.includesAny(baseArray, elementsToCheck);
     * console.log(result); // true, because 5 is found in the baseArray
     *
     * const elementsToCheck2 = [6, 7];
     * const result2 = YourClass.includesAny(baseArray, elementsToCheck2);
     * console.log(result2); // false, because neither 6 nor 7 are in the baseArray
     * ```
     */
    static includesAny<T>(baseArray: T[], elements: T[]): boolean {
        const elementsSet = new Set(elements);
        return baseArray.some((element) => elementsSet.has(element));
    }

    /**
     * Checks if all values for a specified property in an array of objects are unique.
     *
     * @template T - The type of the elements in the array.
     * @param {T[]} array - The array of objects to check.
     * @param {keyof T} property - The property to check for uniqueness.
     * @returns {boolean} - `true` if all values for the specified property are unique; otherwise, `false`.
     */
    static arePropertyValuesUnique<T>(array: T[], property: keyof T): boolean {
        const valueSet = new Set<T[keyof T]>();
        for (const item of array) {
            const value = item[property];
            if (valueSet.has(value)) {
                return false; // Duplicate value found
            }
            valueSet.add(value);
        }
        return true; // All values are unique
    }

    /**
     * Checks if all values in an array of objects are same.
     * @param arrays  - The arrays of objects to check against each other.
     * @returns {boolean} - `true` if all values in the arrays are same; otherwise, `false`.
     */
    static compareObjectArrays(...arrays: (string[] | null | undefined)[]): boolean {
        if (arrays.length === 0) return true;
        const firstArray = arrays[0];
        return arrays.every((arr) => {
            return JSON.stringify(arr) === JSON.stringify(firstArray);
        });
    }

    /**
     * Returns a new array containing only the unique values from the input array.
     *
     * @template T - The type of elements in the array.
     * @param {T[]} array - The input array from which to extract unique values.
     * @returns {T[]} - A new array containing only the unique values from the input array.
     *
     * @example
     * ```typescript
     * const inputArray = [1, 2, 2, 3, 4, 4, 5];
     * const uniqueValues = ArrayUtils.getUniqueValues(inputArray);
     * console.log(uniqueValues); // Output: [1, 2, 3, 4, 5]
     * ```
     */
    static getUniqueValues<T>(array: T[]): T[] {
        return Array.from(new Set(array));
    }

    /**
     * Finds an element in an array that matches the provided element.
     *
     * @template T - The type of elements in the array.
     * @param {T[]} array - The array to search in.
     * @param {T} element - The element to find.
     * @returns {T | undefined} - The found element or `undefined` if not found.
     */
    static findElement<T>(array: T[], element: T): T | undefined {
        if (!array || array.length === 0) return undefined;
        for (const item of array) {
            if (JSON.stringify(item) === JSON.stringify(element)) {
                return item;
            }
        }
        return undefined;
    }

    /**
     * Finds an element in an array that matches the provided comparison function.
     *
     * @template T - The type of elements in the array.
     * @param {T[]} array - The array to search in.
     * @param {(item: T) => boolean} compareFn - The comparison function to determine if an element matches.
     * @returns {T | undefined} - The found element or `undefined` if not found.
     */
    static find<T>(array: T[], compareFn: (item: T) => boolean): T | undefined {
        if (!array || array.length === 0) return undefined;
        for (const item of array) {
            if (compareFn(item)) {
                return item;
            }
        }
        return undefined;
    }
}
