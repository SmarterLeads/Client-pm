/** Default card columns on md+ for report overview-style rows. */
export const REPORT_CARD_ROW_COLUMNS = 3;

type ReportCardRowOptions = {
  /** Grid column count at md+ (default 3). */
  columns?: number;
  /** Center via flex when item count is at most this value (default: columns - 1). */
  centerUpTo?: number;
};

function shouldCenterReportCardRow(itemCount: number, options?: ReportCardRowOptions): boolean {
  const columns = options?.columns ?? REPORT_CARD_ROW_COLUMNS;
  const centerUpTo = options?.centerUpTo ?? columns - 1;
  return itemCount > 0 && itemCount <= centerUpTo;
}

/** Flex-centered row when item count <= centerUpTo; otherwise a full-width grid row. */
export function reportCardRowLayoutClass(
  itemCount: number,
  options?: ReportCardRowOptions,
): string {
  if (shouldCenterReportCardRow(itemCount, options)) {
    return "flex flex-wrap justify-center gap-4";
  }
  const columns = options?.columns ?? REPORT_CARD_ROW_COLUMNS;
  if (columns === 4) {
    return "grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4";
  }
  return "grid grid-cols-1 gap-4 md:grid-cols-3";
}

/** Fixed card width when the row is flex-centered (matches one grid column). */
export function reportCardItemShellClass(
  itemCount: number,
  options?: ReportCardRowOptions,
): string {
  if (shouldCenterReportCardRow(itemCount, options)) {
    return "w-full md:w-[calc((100%-2rem)/3)] md:max-w-[22rem] shrink-0";
  }
  return "";
}
