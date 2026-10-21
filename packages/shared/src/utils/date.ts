/**
 * Pure inclusive calendar date utilities for Indian Standard Time (Asia/Kolkata).
 * Dates are represented consistently as "YYYY-MM-DD" strings to prevent timezone shifting.
 */

export function isValidDateString(dateStr: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !isNaN(Date.parse(dateStr));
}

/**
 * Returns today's date in Asia/Kolkata timezone as "YYYY-MM-DD".
 */
export function getTodayInKolkata(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date()); // Formats as YYYY-MM-DD
}

/**
 * Compares two "YYYY-MM-DD" strings.
 * Returns negative if d1 < d2, 0 if equal, positive if d1 > d2.
 */
export function compareDates(d1: string, d2: string): number {
  return d1.localeCompare(d2);
}

/**
 * Checks if targetDate is inclusive between startDate and endDate.
 */
export function isDateInRange(targetDate: string, startDate: string, endDate: string): boolean {
  return compareDates(targetDate, startDate) >= 0 && compareDates(targetDate, endDate) <= 0;
}

/**
 * Checks if two date ranges overlap (both inclusive).
 * [startA, endA] overlaps [startB, endB] iff startA <= endB and startB <= endA.
 */
export function doRangesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return compareDates(startA, endB) <= 0 && compareDates(startB, endA) <= 0;
}

/**
 * Adds or subtracts days from a "YYYY-MM-DD" string.
 */
export function shiftDateDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const nextY = dt.getUTCFullYear();
  const nextM = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const nextD = String(dt.getUTCDate()).padStart(2, '0');
  return `${nextY}-${nextM}-${nextD}`;
}

/**
 * Calculates previous day for posting end reminder (the day before inclusive end date).
 */
export function getDayBefore(dateStr: string): string {
  return shiftDateDays(dateStr, -1);
}

/**
 * Formats a "YYYY-MM-DD" date into user-friendly format (e.g. "07 Oct 2026").
 */
export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(d).padStart(2, '0')} ${months[m - 1]} ${y}`;
}

/**
 * Formats a date range into e.g. "07–21 Oct" or "25 Oct–05 Nov 2026".
 */
export function formatRangeDisplay(startDate: string, endDate: string): string {
  if (!startDate || !endDate) return '';
  const [y1, m1, d1] = startDate.split('-').map(Number);
  const [y2, m2, d2] = endDate.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  if (y1 === y2) {
    if (m1 === m2) {
      return `${String(d1).padStart(2, '0')}–${String(d2).padStart(2, '0')} ${months[m1 - 1]} ${y1}`;
    }
    return `${String(d1).padStart(2, '0')} ${months[m1 - 1]} – ${String(d2).padStart(2, '0')} ${months[m2 - 1]} ${y1}`;
  }
  return `${String(d1).padStart(2, '0')} ${months[m1 - 1]} ${y1} – ${String(d2).padStart(2, '0')} ${months[m2 - 1]} ${y2}`;
}
