import { getMarketingChannelLabel } from "@/lib/clients/overview-fields";

export type MrrBreakdown = Record<string, number>;

export function parseMrrBreakdown(value: unknown): MrrBreakdown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const out: MrrBreakdown = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!key.trim()) continue;
    const cents = typeof raw === "number" ? raw : Number(raw);
    if (Number.isFinite(cents) && cents >= 0) {
      out[key] = Math.round(cents);
    }
  }
  return out;
}

export function sumMrrBreakdown(breakdown: MrrBreakdown): number {
  return Object.values(breakdown).reduce((sum, cents) => sum + (cents ?? 0), 0);
}

export function channelMrrCents(
  breakdown: MrrBreakdown,
  channel: string,
): number {
  return breakdown[channel] ?? 0;
}

export function withChannelMrrCents(
  breakdown: MrrBreakdown,
  channel: string,
  cents: number | null,
): MrrBreakdown {
  return {
    ...breakdown,
    [channel]: cents == null ? 0 : Math.max(0, Math.round(cents)),
  };
}

export function orderedMrrBreakdownChannels(
  marketingChannels: string[] | null | undefined,
): string[] {
  return [...new Set((marketingChannels ?? []).filter(Boolean))];
}

export function mrrBreakdownMismatchMessage(
  breakdownTotalCents: number,
  totalMrrCents: number | null | undefined,
): string | null {
  if (totalMrrCents == null) return null;
  if (breakdownTotalCents === totalMrrCents) return null;

  const format = (cents: number) =>
    new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(cents / 100);

  return `Breakdown total (${format(breakdownTotalCents)}) doesn't match Total MRR (${format(totalMrrCents)})`;
}

export { getMarketingChannelLabel };
