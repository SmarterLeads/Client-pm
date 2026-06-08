import {
  reportCardItemShellClass,
  reportCardRowLayoutClass,
} from "@/components/marketing/report/report-centered-row";

export type ConversionBreakdownItem = {
  id: string;
  label: string;
  conversionType: string;
  current: number;
  prior: number;
  currentValue?: number;      // NEW
  priorValue?: number;         // NEW
};

/** Matches client report conversion_type — lead, appointment, call, chat per product spec */
function conversionTypeBadgeStyle(type: string): { bg: string; short: string } {
  const t = (type ?? "other").toLowerCase();
  if (t === "lead") return { bg: "#2563eb", short: "Lead" };
  if (t === "appointment") return { bg: "#9333ea", short: "Appt" };
  if (t === "call") return { bg: "#16a34a", short: "Call" };
  if (t === "chat") return { bg: "#ea580c", short: "Chat" };
  if (t === "purchase") return { bg: "#0891b2", short: "Buy" };
  return { bg: "#71717a", short: "Other" };
}

function deltaLine(current: number, prior: number): {
  pctText: string;
  positive: boolean | null;
  isNeutral: boolean;
} {
  if (prior > 0) {
    const pct = ((current - prior) / prior) * 100;
    const text = `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
    if (Math.abs(pct) < 0.005) return { pctText: text, positive: null, isNeutral: true };
    return { pctText: text, positive: pct > 0, isNeutral: false };
  }
  if (prior === 0 && current > 0) {
    return { pctText: "New", positive: true, isNeutral: false };
  }
  return { pctText: "0%", positive: null, isNeutral: true };
}

export function ConversionBreakdownCards({
  accentColor,
  items,
}: {
  accentColor: string;
  items: ConversionBreakdownItem[];
}) {
  if (items.length === 0) return null;

  const n = items.length;

  if (n <= 3) {
    return (
      <section aria-label="Conversion breakdown" className="mb-8">
        <div className={reportCardRowLayoutClass(n, { centerUpTo: 3 })}>
          {items.map((item) => (
            <div key={item.id} className={reportCardItemShellClass(n, { centerUpTo: 3 })}>
              <ConversionBreakdownCard accentColor={accentColor} item={item} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  const gridClass =
    n <= 6 ? "grid grid-cols-2 gap-4 md:grid-cols-4" : "grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6";

  return (
    <section aria-label="Conversion breakdown" className={`mb-8 ${gridClass}`}>
      {items.map((item) => (
        <ConversionBreakdownCard key={item.id} accentColor={accentColor} item={item} />
      ))}
    </section>
  );
}

function ConversionBreakdownCard({
  item,
  accentColor,
}: {
  item: ConversionBreakdownItem;
  accentColor: string;
}) {
  const badge = conversionTypeBadgeStyle(item.conversionType);
  const delta = deltaLine(item.current, item.prior);
  const isPurchase = item.conversionType?.toLowerCase() === "purchase";
  const hasValue = isPurchase && (item.currentValue ?? 0) > 0;

  return (
    <div
      className="rounded-xl border border-zinc-200 bg-white p-5 text-center"
      style={{ borderTopWidth: "3px", borderTopColor: accentColor }}
    >
      <div className="mb-2 flex flex-col items-center gap-2">
        <p className="text-base font-semibold leading-snug text-zinc-800">{item.label}</p>
        <span
          className="inline-flex shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
          style={{ backgroundColor: badge.bg }}
          title={item.conversionType}
        >
          {badge.short}
        </span>
      </div>
      <p className="text-2xl font-bold tracking-tight tabular-nums text-zinc-900">
        {formatWhole(Math.round(item.current))}
      </p>

      {hasValue && (
        <>
          <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums text-zinc-900">
            {formatCurrency(item.currentValue ?? 0)}
          </p>
          <p className="mt-2 text-xs text-zinc-400">
            Prior:&nbsp;
            <span className="tabular-nums text-zinc-500">
              {formatCurrency(item.priorValue ?? 0)}
            </span>
          </p>
        </>
      )}

      <p className="mt-2 text-xs text-zinc-400">
        Prior:&nbsp;
        <span className="tabular-nums text-zinc-500">
          {formatWhole(Math.round(item.prior))}
        </span>
      </p>
      <p
        className={`mt-2 flex items-center justify-center gap-1 text-xs font-medium ${toneClass(delta)}`}
      >
        {delta.positive !== null ? <ArrowIcon positive={delta.positive} /> : null}
        <span>{delta.pctText}</span>
      </p>
    </div>
  );
}

function toneClass(delta: { positive: boolean | null; isNeutral: boolean }) {
  if (delta.isNeutral) return "text-zinc-500";
  return delta.positive === true ? "text-emerald-600" : "text-red-600";
}

function ArrowIcon({ positive }: { positive: boolean }) {
  if (positive) {
    return (
      <svg
        className="h-4 w-4 shrink-0 text-emerald-600"
        aria-hidden
        viewBox="0 0 12 12"
        fill="currentColor"
      >
        <title>Increase</title>
        <path d="M6 2.5 L10 9.5 H2 z" />
      </svg>
    );
  }
  return (
    <svg
      className="h-4 w-4 shrink-0 text-red-600"
      aria-hidden
      viewBox="0 0 12 12"
      fill="currentColor"
    >
      <title>Decrease</title>
      <path d="M6 10.5 L2 2.5 h8 z" />
    </svg>
  );
}

function formatWhole(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}