import moment, { type MomentInput } from 'moment-timezone';


export enum DURATION {
    HOURS = 'hours',
    DAYS = 'days',
    WEEKS = 'weeks',
    MONTHS = 'months',
    YEARS = 'years',
}

export enum MONTH {
    JANUARY = 'january',
    FEBRUARY = 'february',
    MARCH = 'march',
    APRIL = 'april',
    MAY = 'may',
    JUNE = 'june',
    JULY = 'july',
    AUGUST = 'august',
    SEPTEMBER = 'september',
    OCTOBER = 'october',
    NOVEMBER = 'november',
    DECEMBER = 'december',
}

export enum TIME_UNIT {
    MILLISECOND = 'millisecond',
    SECOND = 'second',
    MINUTE = 'minute',
    HOUR = 'hour',
    DAY = 'day',
    WEEK = 'week',
    MONTH = 'month',
    YEAR = 'year',
}
/**
 * Enum representing the different formats for displaying months.
 *
 * - `NUMBER`: Represents the month as a 1-based index (e.g., 1 for January, 10 for October).
 * - `SHORT`: Represents the month using its abbreviated name (e.g., 'Jan' for January, 'Oct' for October).
 * - `LONG`: Represents the month using its full name (e.g., 'January' for January, 'October' for October).
 *
 * This enum is used to specify the desired format when retrieving the current or previous month in various functions.
 *
 * @enum {string}
 */
export enum MONTH_FORMAT {
    /** 1-based month index (e.g., 10 for October) */
    NUMBER = 'number',

    /** SHORT month name (e.g., 'Oct') */
    SHORT = 'short',

    /** Full month name (e.g., 'October') */
    LONG = 'long',
}

type MonthsWithYearResult = {
    currentMonth: { number: string; formatted: string; unix: number };
    lastMonth: { number: string; formatted: string; unix: number };
    year: number;
};

/**
 * A utility class for time and date manipulations and formatting.
 */
export class TimeUtils {
    /**
     * Calculates the period between two dates and returns a string representation of the duration in hours, days, or weeks.
     *
     * This function compares the difference between `start_date` and `end_date` and returns a rounded result for
     * the difference in hours, days, or weeks. If the difference is less than 24 hours, the result is in hours.
     * If the difference is greater than 7 days, the result is in weeks. Otherwise, the result is in days.
     *
     * The difference is rounded to the nearest half (e.g., 1.5 hours, 2.0 days, 3.5 weeks).
     *
     * @param {Date} start_date - The start date to calculate the period from.
     * @param {Date} end_date - The end date to calculate the period to.
     * @returns A string representation of the time period in hours, days, or weeks (rounded to the nearest half).
     *
     * @example
     * const start = new Date("2024-11-01T00:00:00");
     * const end = new Date("2024-11-05T12:00:00");
     * logger.debug(TimeUtils.period(start, end)); // "4 days"
     */
    static period(start_date: Date, end_date: Date): string {
        const startMoment = moment(start_date);
        const endMoment = moment(end_date);

        const msDiff = endMoment.diff(startMoment);
        const hoursDiff = msDiff / (1000 * 60 * 60);
        const daysDiff = msDiff / (1000 * 60 * 60 * 24);
        // const weeksDiff = msDiff / (1000 * 60 * 60 * 24 * 7);

        const roundToHalf = (num: number) => Math.ceil(num * 2) / 2;

        let period;
        if (hoursDiff < 24) {
            period = `${roundToHalf(hoursDiff)} hours`;
        } else {
            period = `${roundToHalf(daysDiff)} days`;
        }

        return period;
    }

    /**
     * Calculates the age of a person based on their date of birth.
     *
     * This method computes the age by comparing the given date of birth (in UNIX timestamp format) with the current date.
     * It handles cases where the month and day of the birthdate have not yet occurred in the current year, adjusting the age accordingly.
     *
     * @param {number} dateOfBirth - The date of birth in UNIX timestamp format (seconds since January 1, 1970).
     * @throws {Error} Throws an error if the `dateOfBirth` is invalid (not a number or a non-positive value).
     * @returns {number} The calculated age based on the current date.
     *
     * @example
     * const age = TimeUtils.getAge(630720000); // Assume this is a valid timestamp for a birthdate
     * logger.debug(age); // Returns the person's age
     */
    static getAge(dateOfBirth: number): number {
        if (isNaN(dateOfBirth)) throw new Error('Invalid date of birth');
        const birthDate = moment.unix(dateOfBirth); // Converts seconds to Moment date
        const today = moment();
        if (!birthDate.isValid()) throw new Error('Invalid date of birth');
        return today.diff(birthDate, 'years');
    }

    /**
     * Returns the current month and last month in both numeric and formatted forms, along with the current year.
     *
     * @param format - The desired format for the month names.
     *                 Can be `MONTH_FORMAT.SHORT` for abbreviated month names (e.g., "Oct"),
     *                 or `MONTH_FORMAT.LONG` for full month names (e.g., "October").
     *
     * @returns An object containing:
     * - `currentMonth`: An object with:
     *    - `number`: Numeric representation of the current month (1-based, e.g., "10" for October).
     *    - `formatted`: Formatted name of the current month (e.g., "Oct" or "October").
     * - `lastMonth`: An object with:
     *    - `number`: Numeric representation of the last month (1-based, e.g., "9" for September).
     *    - `formatted`: Formatted name of the last month (e.g., "Sep" or "September").
     * - `year`: The current year.
     *
     * @throws {Error} If an invalid `MONTH_FORMAT` is provided.
     *
     * @example
     * ```typescript
     * const result = TimeUtils.getCurrentAndLastMonthsWithYear(MONTH_FORMAT.SHORT);
     * logger.debug(result);
     * // Output:
     * // {
     * //   currentMonth: { number: '10', formatted: 'Oct' },
     * //   lastMonth: { number: '9', formatted: 'Sep' },
     * //   year: 2024
     * // }
     *
     * const resultLong = TimeUtils.getCurrentAndLastMonthsWithYear(MONTH_FORMAT.LONG);
     * logger.debug(resultLong);
     * // Output:
     * // {
     * //   currentMonth: { number: '10', formatted: 'October' },
     * //   lastMonth: { number: '9', formatted: 'September' },
     * //   year: 2024
     * // }
     * ```
     */
    static getCurrentAndLastMonthsWithYear(format: MONTH_FORMAT = MONTH_FORMAT.LONG): MonthsWithYearResult {
        const now = moment();

        const formatMonth = (date: moment.Moment): { number: string; formatted: string; unix: number } => {
            const number = date.format('M'); // Numeric month (e.g., "10")
            let formatted: string;

            switch (format) {
                case MONTH_FORMAT.SHORT:
                    formatted = date.format('MMM'); // Short name (e.g., "Oct")
                    break;
                case MONTH_FORMAT.LONG:
                    formatted = date.format('MMMM'); // Full name (e.g., "October")
                    break;
                default:
                    throw new Error('Invalid format type');
            }

            return { number, formatted, unix: date.unix() };
        };

        const currentMonth = formatMonth(now);
        const lastMonth = formatMonth(now.clone().subtract(1, 'month'));
        const year = now.year();

        return { currentMonth, lastMonth, year };
    }

    /**
     * Converts a date to a Unix timestamp.
     *
     * @param date - The date to convert. Accepts all Moment.js input formats:
     *               - ISO 8601 string (e.g., "2024-11-28T10:00:00Z")
     *               - Unix timestamp in milliseconds or seconds (e.g., 1701165600 or 1701165600000)
     *               - Native JavaScript `Date` object (e.g., new Date())
     *               - Object containing year, month, etc. (e.g., { year: 2024, month: 10, day: 28 })
     *               - Moment instance (e.g., moment())
     *
     * @returns The Unix timestamp (in seconds) corresponding to the input date.
     *
     * @throws {Error} If the input date is invalid or cannot be parsed.
     *
     * @example
     * ```typescript
     * const timestamp = DateUtils.unix("2024-11-28T10:00:00Z");
     * logger.debug(timestamp); // Output: 1701165600
     *
     * const timestampFromMoment = DateUtils.unix(moment());
     * logger.debug(timestampFromMoment); // Current Unix timestamp
     *
     * const timestampFromDate = DateUtils.unix(new Date());
     * logger.debug(timestampFromDate); // Current Unix timestamp
     * ```
     */
    static unix(date?: MomentInput, milliseconds?: boolean): number {
        // If no date is provided, moment() returns current date/time
        const momentDate = moment(date);
        if (!momentDate.isValid()) {
            throw new Error('Invalid date input');
        }
        const coefficient = milliseconds ? 1000 : 1;
        return momentDate.unix() * coefficient;
    }

    /**
     * @returns The current moment instance
     */
    static now(): moment.Moment {
        return moment();
    }

    /**
     * @returns The current moment instance
     */
    static fromDate(date: Date): moment.Moment {
        return moment(date);
    }

    /**
     * Returns the year from a given Unix timestamp.
     * @param timestamp - The Unix timestamp in seconds.
     * @returns The year as a number.
     */
    static getYear(timestamp: number): number {
        return moment.unix(timestamp).year();
    }

    static getQuarter(date?: MomentInput): number {
        return moment(date).quarter();
    }

    static fromIsoDateStringToDate(isoStr: string): Date {
        const [startY, startM, startD] = isoStr.split('-').map(Number);
        return new Date(startY, startM - 1, startD);
    }

    static fromUnixToDate(timestampInSeconds: number): Date {
        const date = new Date(timestampInSeconds * 1000);
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }

    static fromDateToIsoDateStr(date: Date): string {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    static fromDateToUtcIsoDateStr(date: Date): string {
        const year = date.getUTCFullYear();
        const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
        const day = date.getUTCDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    static getYearsBetweenDates(start: Date, end: Date): number[] {
        const startYear = start.getFullYear();
        const endYear = end.getFullYear();

        const years: number[] = [];

        for (let year = startYear; year <= endYear; year++) {
            years.push(year);
        }

        return years;
    }

    static getYearBounds(year: number): { start: Date; end: Date } {
        const start = new Date(year, 0, 1, 0, 0, 0, 0); // Jan 1st, 00:00:00
        const end = new Date(year, 11, 31, 23, 59, 59, 999); // Dec 31st, 23:59:59.999
        return { start: new Date(start), end: new Date(end) };
    }

    /**
     * Validates and formats a given date input to the specified output format.
     * Supports Unix timestamps, date strings, and Date objects.
     *
     * @param date - The date input to validate (Unix timestamp, date string, or Date object).
     * @param outputFormat - The desired output format (default: 'YYYY-MM-DD').
     * @returns The formatted date string.
     * @throws Error if the date is invalid or the input type is unsupported.
     */
    static validateAndFormatDate(date: MomentInput, outputFormat: string = 'YYYY-MM-DD'): string {
        let momentDate: moment.Moment;
        if (typeof date === 'number') {
            momentDate = date.toString().length === 10 ? moment.unix(date) : moment(date);
        } else if (typeof date === 'string' || date instanceof Date) {
            momentDate = moment(date);
        } else {
            throw new Error(`Unsupported date type: ${typeof date}`);
        }
        if (!momentDate.isValid()) {
            throw new Error(`Invalid date: ${date}`);
        }
        return momentDate.format(outputFormat);
    }

    /**
     * Adds a specified duration to a given date and returns the resulting Unix timestamp.
     *
     * @param date - The original date as a Unix timestamp.
     * @param durationAmount - The amount of duration to add (e.g., 1 for 1 day, 2 for 2 weeks).
     * @param durationUnit - The unit of the duration (e.g., 'days', 'months', 'years').
     *
     * @returns The new Unix timestamp after adding the specified duration.
     *
     * @example
     * const newDate = TimeUtils.addDurationToDate(1609459200, 5, DURATION.DAYS);
     * // Returns the Unix timestamp for 5 days after January 1, 2021.
     */
    static addDurationToDate(date: number, durationAmount: number, durationUnit: DURATION): number {
        const momentDate = moment.unix(date);
        return momentDate.clone().add(durationAmount, durationUnit).unix();
    }

    /**
     * Calculates the number of remaining days (or other time units) from the current date to the target date.
     *
     * @param targetDate - The target date as a Unix timestamp.
     * @param durationUnit - The unit of time for the difference (optional, default is `DURATION.DAYS`).
     *
     * @returns The number of time units remaining from the current date to the target date. A negative number indicates the target date has already passed.
     *
     * @example
     * const remainingDays = TimeUtils.getRemainingDaysFromDate(1656604800);
     * // Returns the number of days from today to June 30, 2022 (in Unix timestamp).
     *
     * const remainingMonths = TimeUtils.getRemainingDaysFromDate(1656604800, DURATION.MONTHS);
     * // Returns the number of months from today to the target date.
     */
    static getRemainingDaysFromDate(targetDate: number, durationUnit: DURATION = DURATION.DAYS): number {
        const now = moment();
        return moment.unix(targetDate).diff(now, durationUnit);
    }

    /**
     * Formats a given date into a specified format using moment.js.
     *
     * @param date - The date to be formatted, can be a string, number (Unix timestamp), or Date object.
     * @param format - The format to apply to the date (e.g., 'YYYY-MM-DD').
     * @returns The formatted date as a string.
     */
    static format(date: MomentInput, format: string): string {
        return moment(date).format(format);
    }

    /**
     * Formats a given date into a specified format using moment.js.
     *
     * @param seconds - Duration in seconds.
     * @returns The formatted date as a string.
     */
    static stringifyDuration(seconds: number): string {
        return `${String(Math.floor(seconds / 60 / 60)).padStart(2, '0')}:${String(Math.floor((seconds / 60) % 60)).padStart(2, '0')}`;
    }

    /**
     * Formats a given Unix timestamp into a specified format using moment.js.
     *
     * @param unixTimestampSeconds - The Unix timestamp in seconds.
     * @param format - The format to apply to the date (e.g., 'YYYY-MM-DD').
     * @param timezone - Timezone handling:
     *   - If string: IANA timezone identifier (e.g., 'Europe/Helsinki', 'Asia/Tokyo')
     *   - If 'UTC': Uses UTC timezone
     *   - If undefined/null: Uses local system timezone
     * @returns The formatted date as a string.
     *
     * @example
     * // Format using local system timezone
     * TimeUtils.formatUnix(1743454800, 'YYYY-MM-DD'); // "2025-03-31" or "2025-04-01" depending on server timezone
     *
     * // Format using UTC
     * TimeUtils.formatUnix(1743454800, 'YYYY-MM-DD', 'UTC'); // "2025-03-31"
     *
     * // Format using specified timezone
     * TimeUtils.formatUnix(1743454800, 'YYYY-MM-DD', 'Europe/Istanbul'); // "2025-04-01"
     */
    static formatUnix(unixTimestampSeconds: number, format: string = 'YYYY-MM-DD', timezone?: string | null): string {
        const momentObj = moment.unix(unixTimestampSeconds);

        if (timezone === 'UTC') {
            return momentObj.utc().format(format);
        } else if (timezone) {
            // This requires moment-timezone
            return momentObj.tz(timezone).format(format);
        }

        // Default: use local timezone (server timezone)
        return momentObj.format(format);
    }

    /**
     * Checks if a given date corresponds to someone under 18 years old.
     *
     * @param birthDate - The birthdate to check, can be a string, number (Unix timestamp), or Date object.
     * @returns `true` if the person is under 18, otherwise `false`.
     */
    static isUnder18(birthDate: MomentInput): boolean {
        const ageCutoffDate = moment().subtract(18, 'years');
        const birthMoment = moment(birthDate);
        return birthMoment.isAfter(ageCutoffDate);
    }

    /**
     * @returns Week number of the year (1-53)
     */
    static getWeekNumber(date?: MomentInput): number {
        return moment(date).isoWeek();
    }

    /**
     * @returns Day number of the week (1-7, starts with Monday)
     */
    static getWeekDayNumber(date?: MomentInput): number {
        return moment(date).isoWeekday();
    }

    /**
     * Returns the timestamp for the start of a specific week and year.
     *
     * @param year - The year as a number (e.g., 2024)
     * @param week - The week number as a number (e.g., 24 for the 24th week)
     * @returns The timestamp (in milliseconds) for the start of the given week and year.
     */
    static getTimestampForWeekOfYear(year: number, week: number): number {
        if (week < 1 || week > 53) {
            throw new Error('Week must be between 1 and 53.');
        }
        const timestamp = moment().isoWeekYear(year).isoWeek(week).startOf('isoWeek');
        return timestamp.unix();
    }

    /**
     * Returns the timestamp for the start of a specific month and year.
     *
     * @param year - The year as a number (e.g., 2024)
     * @param month - The month number (1–12, where 1 = January)
     * @returns The timestamp (in seconds) for the start of the given month and year.
     */
    static getTimestampForMonthOfYear(year: number, month: number): number {
        if (month < 1 || month > 12) {
            throw new Error('Month must be between 1 and 12.');
        }
        // Moment uses 0-based months internally, so subtract 1
        const timestamp = moment.utc({ year, month: month - 1, day: 1 }).startOf('month');
        return timestamp.unix(); // Return in seconds
    }

    //get last two years
    static getLastTwoYears(baseYear?: number, includeBaseYear?: boolean): number[] {
        const year = baseYear ?? moment().year();
        return [year - 2, year - 1, ...(includeBaseYear ? [year] : [])];
    }

    // Start of the day for a given timestamp in UTC
    static startOfDay(timestamp: number): number {
        return moment.utc(timestamp).startOf('day').valueOf();
    }

    static addMonths(timestamp: number, intervals: number): number {
        return moment.utc(timestamp).add(intervals, 'months').valueOf();
    }

    // Get the first occurrence of a specific weekday in the month (UTC)
    static getFirstWeekdayOfMonth(timestamp: number, weekday: number): number {
        let firstDayOfMonth = moment.utc(timestamp).startOf('month');
        let firstWeekdayOffset = (weekday - firstDayOfMonth.day() + 7) % 7;
        return firstDayOfMonth.add(firstWeekdayOffset, 'days').valueOf();
    }

    // Get the last occurrence of a specific weekday in the month (UTC)
    static getLastWeekdayOfMonth(timestamp: number, weekday: number): number {
        let lastDayOfMonth = moment.utc(timestamp).endOf('month');
        let lastWeekdayOffset = (weekday - lastDayOfMonth.day() + 7) % 7;
        return lastDayOfMonth.subtract(lastWeekdayOffset, 'days').valueOf();
    }

    // Converts a timestamp to UTC Date object
    static toUTCDate(timestamp: number): Date {
        return new Date(moment.utc(timestamp).toISOString());
    }

    static getUTCDay(timestamp: number) {
        return moment.utc(timestamp).day();
    }

    static getMondayBasedUTCDay(timestamp: number) {
        const day = moment.utc(timestamp).day(); // Original day (Sunday = 0, Monday = 1, etc.)
        return day === 0 ? 6 : day - 1; // Shift Sunday to the end, and subtract 1
    }

    /**
     * Returns the start and end timestamps (milliseconds) for a given date.
     * If no date is provided, it defaults to the current date.
     *
     * @param date - The input date (MomentInput). Defaults to today if not provided.
     * @returns An object containing the start and end timestamps.
     */
    static getDateStartEndRange(date?: MomentInput): { start: number; end: number } {
        const day = moment(date).startOf('day');
        return {
            start: day.valueOf(),
            end: day.endOf('day').valueOf(),
        };
    }
}
