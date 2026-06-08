/** UTC calendar dates as YYYY-MM-DD for Postgres `date` columns. */
export type SevenDayWindows = {
  currentDateExclusive: string;
  last7Start: string;
  last7End: string;
  prior7Start: string;
  prior7End: string;
};

export type DateRangePreset =
  | "last_7"
  | "last_14"
  | "last_30"
  | "mtd"
  | "last_month"
  | "ytd";
export type ComparisonMode = "prior_period" | "prior_year";
export type DateRangeInput =
  | { kind: "preset"; preset: DateRangePreset }
  | { kind: "custom"; start: string; end: string };
export type ComparisonWindows = {
  currentStart: string;
  currentEnd: string;
  priorStart: string;
  priorEnd: string;
  queryStart: string;
  queryEndExclusive: string;
};

function toISODateUTC(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addDaysUTC(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return toISODateUTC(d);
}

function addYearsUTC(iso: string, years: number) {
  const d = new Date(`${iso}T12:00:00.000Z`);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return toISODateUTC(d);
}

function diffDaysInclusive(startIso: string, endIso: string): number {
  const s = new Date(`${startIso}T00:00:00.000Z`);
  const e = new Date(`${endIso}T00:00:00.000Z`);
  const ms = e.getTime() - s.getTime();
  return Math.floor(ms / 86400000) + 1;
}

function resolveCurrentWindow(
  input: DateRangePreset | DateRangeInput,
  end: Date,
): { currentStart: string; currentEnd: string } {
  if (typeof input === "object" && input.kind === "custom") {
    return { currentStart: input.start, currentEnd: input.end };
  }

  const preset = typeof input === "string" ? input : input.preset;
  const today = toISODateUTC(end);
  const y = end.getUTCFullYear();
  const m = end.getUTCMonth() + 1;
  const mm = String(m).padStart(2, "0");

  if (preset === "last_7") {
    return { currentStart: addDaysUTC(today, -6), currentEnd: today };
  }
  if (preset === "last_14") {
    return { currentStart: addDaysUTC(today, -13), currentEnd: today };
  }
  if (preset === "last_30") {
    return { currentStart: addDaysUTC(today, -29), currentEnd: today };
  }
  if (preset === "mtd") {
    return { currentStart: `${y}-${mm}-01`, currentEnd: today };
  }
  if (preset === "last_month") {
    const prevMonthEnd = addDaysUTC(`${y}-${mm}-01`, -1);
    const d = new Date(`${prevMonthEnd}T12:00:00.000Z`);
    const pm = String(d.getUTCMonth() + 1).padStart(2, "0");
    return {
      currentStart: `${d.getUTCFullYear()}-${pm}-01`,
      currentEnd: prevMonthEnd,
    };
  }
  return { currentStart: `${y}-01-01`, currentEnd: today };
}

/**
 * Rolling 7+7 windows in **UTC calendar dates**, **excluding `end`'s UTC day** (typically "today").
 *
 * **Last 7:** the 7 full days ending yesterday → `[end-7, end-1]` inclusive.
 * **Prior 7:** the 7 full days immediately before that → `[end-14, end-8]` inclusive.
 */
export function getSevenDayWindowsUTC(end = new Date()): SevenDayWindows {
  const endStr = toISODateUTC(end);
  const last7End = addDaysUTC(endStr, -1);
  const last7Start = addDaysUTC(last7End, -6);
  const prior7End = addDaysUTC(last7Start, -1);
  const prior7Start = addDaysUTC(prior7End, -6);
  return { currentDateExclusive: endStr, last7Start, last7End, prior7Start, prior7End };
}

export function getComparisonWindowsUTC(
  input: DateRangePreset | DateRangeInput,
  comparison: ComparisonMode,
  end = new Date(),
): ComparisonWindows {
  const { currentStart, currentEnd } = resolveCurrentWindow(input, end);

  let priorStart = "";
  let priorEnd = "";
  if (comparison === "prior_year") {
    priorStart = addYearsUTC(currentStart, -1);
    priorEnd = addYearsUTC(currentEnd, -1);
  } else {
    const len = Math.max(1, diffDaysInclusive(currentStart, currentEnd));
    priorEnd = addDaysUTC(currentStart, -1);
    priorStart = addDaysUTC(priorEnd, -(len - 1));
  }

  const queryStart = priorStart < currentStart ? priorStart : currentStart;
  const maxEnd = priorEnd > currentEnd ? priorEnd : currentEnd;
  const queryEndExclusive = addDaysUTC(maxEnd, 1);

  return {
    currentStart,
    currentEnd,
    priorStart,
    priorEnd,
    queryStart,
    queryEndExclusive,
  };
}

export function comparisonPeriodLabel(comparison: ComparisonMode): string {
  return comparison === "prior_year" ? "vs last year" : "vs prior period";
}

export function isDateInRangeInclusive(
  iso: string,
  start: string,
  end: string,
) {
  return iso >= start && iso <= end;
}

export function diffDaysInclusiveWindow(startIso: string, endIso: string): number {
  return diffDaysInclusive(startIso, endIso);
}
