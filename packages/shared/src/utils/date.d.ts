/**
 * Pure inclusive calendar date utilities for Indian Standard Time (Asia/Kolkata).
 * Dates are represented consistently as "YYYY-MM-DD" strings to prevent timezone shifting.
 */
export declare function isValidDateString(dateStr: string): boolean;
/**
 * Returns today's date in Asia/Kolkata timezone as "YYYY-MM-DD".
 */
export declare function getTodayInKolkata(): string;
/**
 * Compares two "YYYY-MM-DD" strings.
 * Returns negative if d1 < d2, 0 if equal, positive if d1 > d2.
 */
export declare function compareDates(d1: string, d2: string): number;
/**
 * Checks if targetDate is inclusive between startDate and endDate.
 */
export declare function isDateInRange(targetDate: string, startDate: string, endDate: string): boolean;
/**
 * Checks if two date ranges overlap (both inclusive).
 * [startA, endA] overlaps [startB, endB] iff startA <= endB and startB <= endA.
 */
export declare function doRangesOverlap(startA: string, endA: string, startB: string, endB: string): boolean;
/**
 * Adds or subtracts days from a "YYYY-MM-DD" string.
 */
export declare function shiftDateDays(dateStr: string, days: number): string;
/**
 * Calculates previous day for posting end reminder (the day before inclusive end date).
 */
export declare function getDayBefore(dateStr: string): string;
/**
 * Formats a "YYYY-MM-DD" date into user-friendly format (e.g. "07 Oct 2026").
 */
export declare function formatDisplayDate(dateStr: string): string;
/**
 * Formats a date range into e.g. "07–21 Oct" or "25 Oct–05 Nov 2026".
 */
export declare function formatRangeDisplay(startDate: string, endDate: string): string;
//# sourceMappingURL=date.d.ts.map