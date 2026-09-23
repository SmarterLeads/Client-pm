/** ISO date (YYYY-MM-DD) for today + `daysFromStart` in local calendar. */
export function dueDateFromDaysFromStart(daysFromStart: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + daysFromStart);
  return date.toISOString().slice(0, 10);
}
