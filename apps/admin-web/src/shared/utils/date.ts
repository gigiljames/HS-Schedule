export function isValidDateString(dateStr: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !isNaN(Date.parse(dateStr));
}

export function getTodayInKolkata(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date());
}

export function compareDates(d1: string, d2: string): number {
  return d1.localeCompare(d2);
}

export function isDateInRange(targetDate: string, startDate: string, endDate: string): boolean {
  return compareDates(targetDate, startDate) >= 0 && compareDates(targetDate, endDate) <= 0;
}

export function doRangesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return compareDates(startA, endB) <= 0 && compareDates(startB, endA) <= 0;
}

export function shiftDateDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const nextY = dt.getUTCFullYear();
  const nextM = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const nextD = String(dt.getUTCDate()).padStart(2, '0');
  return `${nextY}-${nextM}-${nextD}`;
}

export function getDayBefore(dateStr: string): string {
  return shiftDateDays(dateStr, -1);
}

export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(d).padStart(2, '0')} ${months[m - 1]} ${y}`;
}

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
