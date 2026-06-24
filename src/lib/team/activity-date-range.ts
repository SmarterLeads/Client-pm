export type TeamActivityRangePreset =
  | "yesterday"
  | "last_7"
  | "last_30"
  | "custom";

export type TeamActivityDateRange = {
  preset: TeamActivityRangePreset;
  from?: string;
  to?: string;
};

export type TeamActivityWindow = {
  preset: TeamActivityRangePreset;
  startIso: string;
  endIso: string;
  label: string;
};

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function endOfUtcDay(d: Date): string {
  const end = new Date(d);
  end.setUTCHours(23, 59, 59, 999);
  return end.toISOString();
}

function formatUtcDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parseTeamActivityRangePreset(
  raw: string | undefined,
): TeamActivityRangePreset {
  if (
    raw === "yesterday" ||
    raw === "last_7" ||
    raw === "last_30" ||
    raw === "custom"
  ) {
    return raw;
  }
  return "last_7";
}

export function resolveTeamActivityWindow(
  range: TeamActivityDateRange,
): TeamActivityWindow {
  const now = new Date();
  const today = startOfUtcDay(now);

  if (range.preset === "yesterday") {
    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    return {
      preset: range.preset,
      startIso: yesterday.toISOString(),
      endIso: endOfUtcDay(yesterday),
      label: "Yesterday",
    };
  }

  if (range.preset === "last_7") {
    const start = new Date(today);
    start.setUTCDate(start.getUTCDate() - 6);
    return {
      preset: range.preset,
      startIso: start.toISOString(),
      endIso: endOfUtcDay(today),
      label: "Last 7 days",
    };
  }

  if (range.preset === "last_30") {
    const start = new Date(today);
    start.setUTCDate(start.getUTCDate() - 29);
    return {
      preset: range.preset,
      startIso: start.toISOString(),
      endIso: endOfUtcDay(today),
      label: "Last 30 days",
    };
  }

  const from = range.from?.trim();
  const to = range.to?.trim();
  if (from && to) {
    return {
      preset: "custom",
      startIso: `${from}T00:00:00.000Z`,
      endIso: `${to}T23:59:59.999Z`,
      label: `${from} – ${to}`,
    };
  }

  const fallbackStart = new Date(today);
  fallbackStart.setUTCDate(fallbackStart.getUTCDate() - 6);
  return {
    preset: "last_7",
    startIso: fallbackStart.toISOString(),
    endIso: endOfUtcDay(today),
    label: "Last 7 days",
  };
}

export function teamActivityRangeOptions(): {
  value: TeamActivityRangePreset;
  label: string;
}[] {
  return [
    { value: "yesterday", label: "Yesterday" },
    { value: "last_7", label: "Last 7 days" },
    { value: "last_30", label: "Last 30 days" },
    { value: "custom", label: "Custom" },
  ];
}

export function isValidIsoDate(value: string | undefined): value is string {
  if (!value?.trim()) return false;
  const v = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return !Number.isNaN(dt.getTime()) && formatUtcDate(dt) === v;
}
