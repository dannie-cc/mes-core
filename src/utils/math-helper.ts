// Simple utility class for QA team to practice testing
// src/utils/math-helper.ts

export class MathHelper {
    /**
     * Adds two numbers together
     */
    static add(a: number, b: number): number {
        return a + b;
    }

    /**
     * Divides first number by second number
     * Throws error if divisor is zero
     */
    static divide(dividend: number, divisor: number): number {
        if (divisor === 0) {
            throw new Error('Division by zero is not allowed');
        }
        return dividend / divisor;
    }

    /**
     * Calculates what percentage the part is of the total
     */
    static calculatePercentage(part: number, total: number): number {
        if (total === 0) {
            throw new Error('Total cannot be zero');
        }
        return (part / total) * 100;
    }

    /**
     * Finds the maximum value in an array
     */
    static findMax(numbers: number[]): number {
        if (numbers.length === 0) {
            throw new Error('Array cannot be empty');
        }
        return Math.max(...numbers);
    }

    /**
     * Checks if a number is even
     */
    static isEven(num: number): boolean {
        return num % 2 === 0;
    }

    /**
     * Rounds a number to specified decimal places
     */
    static roundToDecimalPlaces(num: number, decimalPlaces: number): number {
        const factor = 10 ** decimalPlaces;
        return Math.round(num * factor) / factor;
    }
}
