export type RecurrenceFrequency =
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "custom";

export type RecurrenceRule = {
  frequency: RecurrenceFrequency;
  days?: string[];
  dayOfMonth?: number;
  custom?: string;
  until?: string;
};

export const WEEKDAY_OPTIONS = [
  { value: "monday", label: "Mon" },
  { value: "tuesday", label: "Tue" },
  { value: "wednesday", label: "Wed" },
  { value: "thursday", label: "Thu" },
  { value: "friday", label: "Fri" },
  { value: "saturday", label: "Sat" },
  { value: "sunday", label: "Sun" },
] as const;

const WEEKDAY_TO_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function isPastUntil(until: string | undefined, date: Date): boolean {
  if (!until) return false;
  return date > parseIsoDate(until);
}

export function parseRecurrenceRule(raw: string | null): RecurrenceRule | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as RecurrenceRule;
    if (!parsed.frequency) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function serializeRecurrenceRule(rule: RecurrenceRule): string {
  return JSON.stringify(rule);
}

export function defaultRecurrenceRule(): RecurrenceRule {
  return { frequency: "weekly", days: ["monday"] };
}

export function calculateNextOccurrence(
  rule: RecurrenceRule,
  referenceDate: Date = new Date(),
): string | null {
  const start = new Date(referenceDate);
  start.setHours(0, 0, 0, 0);

  if (isPastUntil(rule.until, start)) return null;

  switch (rule.frequency) {
    case "daily": {
      const next = new Date(start);
      next.setDate(next.getDate() + 1);
      if (isPastUntil(rule.until, next)) return null;
      return toIsoDate(next);
    }
    case "weekly":
    case "biweekly": {
      const days = rule.days ?? [];
      if (days.length === 0) return null;
      const indices = new Set(days.map((d) => WEEKDAY_TO_INDEX[d]).filter((n) => n !== undefined));

      for (let offset = 1; offset <= 366; offset++) {
        const candidate = new Date(start);
        candidate.setDate(candidate.getDate() + offset);
        if (!indices.has(candidate.getDay())) continue;

        if (rule.frequency === "biweekly") {
          const startWeek = getWeekStart(start);
          const candidateWeek = getWeekStart(candidate);
          const weekDiff = Math.round(
            (candidateWeek.getTime() - startWeek.getTime()) / (7 * 24 * 60 * 60 * 1000),
          );
          if (weekDiff % 2 !== 0) continue;
        }

        if (isPastUntil(rule.until, candidate)) return null;
        return toIsoDate(candidate);
      }
      return null;
    }
    case "monthly": {
      const day = rule.dayOfMonth ?? start.getDate();
      const next = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      next.setDate(Math.min(day, lastDay));
      if (next <= start) {
        next.setMonth(next.getMonth() + 1);
        const last = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
        next.setDate(Math.min(day, last));
      }
      if (isPastUntil(rule.until, next)) return null;
      return toIsoDate(next);
    }
    case "custom":
      return null;
    default:
      return null;
  }
}

export function calculateOccurrenceDates(
  rule: RecurrenceRule,
  referenceDate: Date = new Date(),
  horizonDays = 28,
): string[] {
  if (rule.frequency === "monthly") {
    return calculateMonthlyOccurrenceDates(rule, referenceDate, 3, 3);
  }

  const dates: string[] = [];
  let cursor = new Date(referenceDate);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(cursor);
  end.setDate(end.getDate() + horizonDays);

  for (let i = 0; i < 52; i++) {
    const next = calculateNextOccurrence(rule, cursor);
    if (!next) break;

    const nextDate = parseIsoDate(next);
    if (nextDate > end) break;

    if (!dates.includes(next)) {
      dates.push(next);
    }

    cursor = new Date(nextDate);
  }

  return dates.sort();
}

export function calculateMonthlyOccurrenceDates(
  rule: RecurrenceRule,
  anchorDate: Date = new Date(),
  monthsBack = 3,
  monthsForward = 3,
): string[] {
  const anchor = new Date(anchorDate);
  anchor.setHours(0, 0, 0, 0);
  const day = rule.dayOfMonth ?? anchor.getDate();
  const dates: string[] = [];

  for (let offset = -monthsBack; offset <= monthsForward; offset++) {
    const monthDate = new Date(anchor.getFullYear(), anchor.getMonth() + offset, 1);
    const lastDay = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth() + 1,
      0,
    ).getDate();
    monthDate.setDate(Math.min(day, lastDay));

    if (isPastUntil(rule.until, monthDate)) continue;

    const iso = toIsoDate(monthDate);
    if (!dates.includes(iso)) {
      dates.push(iso);
    }
  }

  return dates.sort();
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatNextOccurrence(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
