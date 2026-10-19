export type WeekRange = {
  weekStart: string;
  weekEnd: string;
  prevWeekStart: string;
  prevWeekEnd: string;
  trendStart: string;
};

function utcDateOnly(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

function addDaysUtc(d: Date, days: number): Date {
  const next = utcDateOnly(d);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function formatIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Last fully completed Mon–Sun week in UTC, plus previous week and 5-week trend start. */
export function getDefaultWeekRangesUtc(ref = new Date()): WeekRange {
  const today = utcDateOnly(ref);
  const dow = today.getUTCDay();
  const daysFromMonday = dow === 0 ? 6 : dow - 1;
  const thisWeekMonday = addDaysUtc(today, -daysFromMonday);
  const lastWeekEnd = addDaysUtc(thisWeekMonday, -1);
  const weekStart = addDaysUtc(lastWeekEnd, -6);
  const weekEnd = lastWeekEnd;
  const prevWeekEnd = addDaysUtc(weekStart, -1);
  const prevWeekStart = addDaysUtc(prevWeekEnd, -6);
  const trendStart = addDaysUtc(weekStart, -28);

  return {
    weekStart: formatIsoDate(weekStart),
    weekEnd: formatIsoDate(weekEnd),
    prevWeekStart: formatIsoDate(prevWeekStart),
    prevWeekEnd: formatIsoDate(prevWeekEnd),
    trendStart: formatIsoDate(trendStart),
  };
}

export function dateInRange(
  date: string,
  start: string,
  end: string,
): boolean {
  return date >= start && date <= end;
}
