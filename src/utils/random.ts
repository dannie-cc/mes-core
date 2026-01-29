import { randomBytes } from 'crypto';
/**
 * Defines the available character sets for generating the random string.
 */
type Charset = 'numeric' | 'alphabetic' | 'alphanumeric' | 'all';

/**
 * Defines the encoding types for cryptographic secure random string generation.
 */
type EncodingType = 'hex' | 'numeric' | 'alphanumeric';

/**
 * Interface representing the options for generating a random string.
 */
export interface Options {
    /**
     * Specifies the case of alphabetic characters.
     * - `upper`: All characters in uppercase.
     * - `lower`: All characters in lowercase.
     */
    charCase?: 'upper' | 'lower';

    /**
     * Specifies the length of the generated string.
     * @default 8
     */
    length?: number;

    /**
     * Specifies the character set to be used for generating the string.
     * @default "all"
     */
    charset?: Charset;

    /**
     * Array of characters to exclude from the generated string.
     */
    exclude?: string[];
}

const NUMBERS = '0123456789';
const ALPHABETS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const SPECIALS = '!$%^&*()_+|~-=`{}[]:;<>?,./';

const DEFAULT_LENGTH: number = 8;
const DEFAULT_CHARSET: Charset = 'all';

/**
 * A utility class for generating random strings with customizable options.
 */
export class RandomStringGenerator {
    /**
     * Merges provided options with defaults.
     *
     * @param options - Partial options to customize the string generation.
     * @returns A complete `Options` object with default values applied.
     */
    private static useDefault(options?: Options): Options {
        const defaultOptions: Options = {
            ...options,
            length: options?.length || DEFAULT_LENGTH,
            charset: options?.charset || DEFAULT_CHARSET,
            exclude: Array.isArray(options?.exclude) ? options.exclude : [],
        };
        return defaultOptions;
    }

    /**
     * Builds a character set based on the specified options.
     *
     * @param options - Options to customize the character set.
     * @returns A string containing characters for the generation pool.
     */
    private static buildChars(options: Options): string {
        let chars = '';
        switch (options.charset) {
            case 'numeric':
                chars = NUMBERS;
                break;
            case 'alphabetic':
                chars = ALPHABETS;
                break;
            case 'alphanumeric':
                chars = NUMBERS + ALPHABETS;
                break;
            default:
                chars = NUMBERS + ALPHABETS + SPECIALS;
                break;
        }
        if (options.exclude) {
            for (let i = 0; i < options.exclude.length; i++) {
                chars = chars.replace(options.exclude[i], '');
            }
        }
        return chars;
    }

    /**
     * Generates a random string based on the provided options.
     *
     * @param options - Optional settings to control string generation:
     *   - `charCase`: Specifies the case format (`upper` or `lower`).
     *   - `length`: The length of the generated string (default: 8).
     *   - `charset`: Specifies the character set (default: `all`).
     *   - `exclude`: Array of characters to exclude from the string.
     *   - `excludeSimilarCharacters`: Excludes visually similar characters if `true`.
     * @returns A random string generated according to the specified options.
     */
    public static generate(options?: Options): string {
        options = this.useDefault(options);
        const length = options.length ?? DEFAULT_LENGTH;
        let randomStr = '';
        const allChars = this.buildChars(options);
        const charsLength = allChars.length;
        for (let i = 1; i <= length; i++) {
            const index = Math.floor(Math.random() * charsLength);
            randomStr += allChars.substring(index, index + 1);
        }
        if (options.charCase) randomStr = options.charCase === 'upper' ? randomStr.toUpperCase() : randomStr.toLowerCase();
        return randomStr;
    }

    /**
     * Generates a cryptographically secure random string using Node.js crypto.
     * This is more secure than the pseudo-random generate() method.
     *
     * @param length - The length of the generated string (default: 6).
     * @param encoding - The encoding to use ('hex', 'alphanumeric', or 'numeric', default: 'alphanumeric').
     * @returns A cryptographically secure random string.
     * @throws {Error} If length is invalid (negative or zero).
     */
    public static generateSecure(length: number = 6, encoding: EncodingType = 'alphanumeric'): string {
        if (length <= 0) {
            throw new Error('Length must be a positive number');
        }

        if (encoding === 'hex') {
            // Hex is predictable: 2 chars per byte
            const bytes = Math.ceil(length / 2);
            return randomBytes(bytes).toString('hex').slice(0, length);
        } else if (encoding === 'numeric') {
            let result = '';
            while (result.length < length) {
                const bytes = randomBytes(1);
                const value = bytes[0] % 10; // digits 0-9
                result += value.toString();
            }
            return result;
        } else {
            // For alphanumeric
            let result = '';
            while (result.length < length) {
                const bufferLength = Math.max(32, (length - result.length) * 2);
                const filtered = randomBytes(bufferLength)
                    .toString('base64')
                    .replace(/[^a-zA-Z0-9]/g, '');
                result += filtered;
            }
            return result.slice(0, length);
        }
    }

    /**
     * Generates a unique ticket number.
     * @returns A unique ticket number in the format "DNXXXXXXX".
     */
    public static generateTicketNumber(): string {
        return 'DN' + this.generateSecure(8, 'numeric');
    }
}
