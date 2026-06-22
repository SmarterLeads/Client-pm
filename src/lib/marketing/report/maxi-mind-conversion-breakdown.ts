import type { ConversionBreakdownGroup } from "@/lib/marketing/lead-gen-types";
import { normalizeConversionType } from "@/lib/marketing/lead-gen-types";
import { metaInsightsActionAggregationKey } from "@/lib/sync/meta-conversion-extract";

export const MAXI_MIND_CLIENT_ID = "4a37f4e3-090f-41b1-b1a2-e86407ffbb1f";

type MaxiMindConfigRow = {
  id: string;
  raw_name: string | null;
  platform?: string | null;
  display_name?: string | null;
  mapped_name?: string | null;
  conversion_type?: string | null;
  sort_order?: number | null;
};

type MaxiMindBucketRaw = {
  platform: string;
  rawName: string;
};

/** Canonical breakdown rows for Maxi Mind Learning (fixed order). */
export const MAXI_MIND_BREAKDOWN_BUCKETS: {
  label: string;
  sortOrder: number;
  conversionType: string;
  raws: MaxiMindBucketRaw[];
  /** Legacy display_name values merged into this bucket. */
  aliases: string[];
}[] = [
  {
    label: "Free Assessments",
    sortOrder: 1,
    conversionType: "lead",
    raws: [
      { platform: "google", rawName: "Free Assessment Qualified" },
      { platform: "meta", rawName: "offsite_conversion.custom.535861637133203" },
      { platform: "microsoft", rawName: "Free Assessment - NEW" },
    ],
    aliases: [],
  },
  {
    label: "Consult Forms",
    sortOrder: 2,
    conversionType: "lead",
    raws: [
      { platform: "google", rawName: "Contact Form / Catch All" },
      { platform: "meta", rawName: "offsite_conversion.custom.370783196881408" },
      { platform: "microsoft", rawName: "Consult Booking" },
    ],
    aliases: ["Consults"],
  },
  {
    label: "Calls",
    sortOrder: 3,
    conversionType: "call",
    raws: [
      { platform: "google", rawName: "GHL Call" },
      { platform: "meta", rawName: "offsite_conversion.custom.2390551301361520" },
    ],
    aliases: ["GHL Calls"],
  },
  {
    label: "Chats",
    sortOrder: 4,
    conversionType: "chat",
    raws: [
      { platform: "google", rawName: "GHL Chat" },
      { platform: "meta", rawName: "offsite_conversion.custom.833454435980103" },
    ],
    aliases: ["GHL Chats"],
  },
  {
    label: "Self Booked Consults",
    sortOrder: 5,
    conversionType: "lead",
    raws: [
      { platform: "google", rawName: "Appointment Booked Conversion" },
      { platform: "meta", rawName: "offsite_conversion.custom.1797634560509863" },
    ],
    aliases: [],
  },
];

const RAW_NAME_TO_LABEL = new Map<string, string>();
const ALIAS_TO_LABEL = new Map<string, string>();

for (const bucket of MAXI_MIND_BREAKDOWN_BUCKETS) {
  ALIAS_TO_LABEL.set(bucket.label.toLowerCase(), bucket.label);
  for (const alias of bucket.aliases) {
    ALIAS_TO_LABEL.set(alias.toLowerCase(), bucket.label);
  }
  for (const { rawName } of bucket.raws) {
    RAW_NAME_TO_LABEL.set(rawName.toLowerCase(), bucket.label);
  }
}

function wowPct(current: number, prior: number): number {
  if (prior > 0) return ((current - prior) / prior) * 100;
  return 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function configDisplayLabel(row: MaxiMindConfigRow): string {
  return (
    row.display_name?.trim() ||
    row.mapped_name?.trim() ||
    row.raw_name?.trim() ||
    ""
  );
}

export function resolveMaxiMindBucketLabel(
  rawName: string | null | undefined,
  displayName: string | null | undefined,
): string | null {
  const raw = (rawName ?? "").trim();
  if (raw) {
    const byRaw = RAW_NAME_TO_LABEL.get(raw.toLowerCase());
    if (byRaw) return byRaw;
    const byRawAlias = ALIAS_TO_LABEL.get(raw.toLowerCase());
    if (byRawAlias) return byRawAlias;
  }
  const display = (displayName ?? "").trim();
  if (display) {
    const byDisplayAlias = ALIAS_TO_LABEL.get(display.toLowerCase());
    if (byDisplayAlias) return byDisplayAlias;
    for (const bucket of MAXI_MIND_BREAKDOWN_BUCKETS) {
      if (bucket.label.toLowerCase() === display.toLowerCase()) return bucket.label;
    }
  }
  return null;
}

function configsForBucket(
  configs: MaxiMindConfigRow[],
  bucketLabel: string,
  platform: string | null,
): MaxiMindConfigRow[] {
  const platformNorm = platform?.trim().toLowerCase() ?? null;
  return configs.filter((config) => {
    const raw = config.raw_name?.trim();
    if (!raw) return false;
    if (platformNorm) {
      const configPlatform = config.platform?.trim().toLowerCase();
      if (configPlatform && configPlatform !== platformNorm) return false;
    }
    return resolveMaxiMindBucketLabel(raw, configDisplayLabel(config)) === bucketLabel;
  });
}

/**
 * Raw names to query in conversion_events — prefers client_conversions raw_name,
 * falls back to hardcoded bucket raws only when no active config exists for that bucket.
 */
export function getMaxiMindRawNamesForQuery(
  configs: MaxiMindConfigRow[],
  platform: string | null,
): string[] {
  const out = new Set<string>();
  const platformNorm = platform?.trim().toLowerCase() ?? null;

  for (const config of configs) {
    const raw = config.raw_name?.trim();
    if (!raw) continue;
    if (platformNorm) {
      const configPlatform = config.platform?.trim().toLowerCase();
      if (configPlatform && configPlatform !== platformNorm) continue;
    }
    if (resolveMaxiMindBucketLabel(raw, configDisplayLabel(config))) {
      out.add(raw);
    }
  }

  for (const bucket of MAXI_MIND_BREAKDOWN_BUCKETS) {
    const hasConfig = configsForBucket(configs, bucket.label, platform).length > 0;
    if (!hasConfig) {
      for (const raw of bucketRawNamesForPlatform(bucket, platform)) {
        out.add(raw);
      }
    }
  }

  return Array.from(out);
}

/** All event raw_names to query for a Maxi Mind platform tab. */
export function getMaxiMindRawNamesForPlatform(platform: string): string[] {
  const p = platform.trim().toLowerCase();
  const out = new Set<string>();
  for (const bucket of MAXI_MIND_BREAKDOWN_BUCKETS) {
    for (const raw of bucket.raws) {
      if (raw.platform.toLowerCase() === p) out.add(raw.rawName);
    }
  }
  return Array.from(out);
}

/** All event raw_names across Google, Meta, and Microsoft (report overview). */
export function getMaxiMindAllRawNames(): string[] {
  const out = new Set<string>();
  for (const bucket of MAXI_MIND_BREAKDOWN_BUCKETS) {
    for (const raw of bucket.raws) out.add(raw.rawName);
  }
  return Array.from(out);
}

function eventCountForRaw(
  rawName: string,
  totals: Map<string, number>,
  useMetaAggKeys: boolean,
): number {
  let count = totals.get(rawName) ?? 0;
  if (count <= 0) {
    const lower = rawName.toLowerCase();
    for (const [key, value] of Array.from(totals.entries())) {
      if (key.toLowerCase() === lower) {
        count = value;
        break;
      }
    }
  }
  if (count <= 0 && useMetaAggKeys) {
    count = totals.get(metaInsightsActionAggregationKey(rawName)) ?? 0;
  }
  return count;
}

function bucketRawNamesForPlatform(
  bucket: (typeof MAXI_MIND_BREAKDOWN_BUCKETS)[number],
  platform: string | null,
): string[] {
  if (!platform) {
    return bucket.raws.map((raw) => raw.rawName);
  }
  const p = platform.trim().toLowerCase();
  return bucket.raws.filter((raw) => raw.platform.toLowerCase() === p).map((raw) => raw.rawName);
}

/** Build exactly five flat Maxi Mind breakdown rows (ignores group_name). */
export function buildMaxiMindConversionBreakdown(params: {
  /** Single platform tab, or null to aggregate all platforms (report overview). */
  platform: string | null;
  configs: MaxiMindConfigRow[];
  totalsCurrent: Map<string, number>;
  totalsPrior: Map<string, number>;
  spendCurrentCents: number;
  useMetaAggKeys?: boolean;
}): ConversionBreakdownGroup[] {
  const { platform, configs, totalsCurrent, totalsPrior, spendCurrentCents } = params;
  const useMetaAggKeys = params.useMetaAggKeys ?? false;

  const rows: ConversionBreakdownGroup["rows"] = MAXI_MIND_BREAKDOWN_BUCKETS.map((bucket) => {
    const bucketRawNames = bucketRawNamesForPlatform(bucket, platform);
    const matchingConfigs = configsForBucket(configs, bucket.label, platform);

    const rawNamesForCounts =
      matchingConfigs.length > 0
        ? matchingConfigs
            .map((config) => config.raw_name?.trim())
            .filter((raw): raw is string => Boolean(raw))
        : bucketRawNames;

    const totalCount = rawNamesForCounts.reduce(
      (sum, raw) => sum + eventCountForRaw(raw, totalsCurrent, useMetaAggKeys),
      0,
    );
    const priorCount = rawNamesForCounts.reduce(
      (sum, raw) => sum + eventCountForRaw(raw, totalsPrior, useMetaAggKeys),
      0,
    );

    const primaryConfig = matchingConfigs[0];

    const id =
      primaryConfig?.id ??
      `maxi-mind:${bucket.label}:${rawNamesForCounts[0] ?? bucket.label}`;

    return {
      id,
      displayName: bucket.label,
      type: normalizeConversionType(
        primaryConfig?.conversion_type ?? bucket.conversionType,
      ),
      sortOrder: bucket.sortOrder,
      totalCount,
      priorCount,
      wowPct: wowPct(totalCount, priorCount),
      costPerConv:
        totalCount > 0 ? round2(spendCurrentCents / 100 / totalCount) : 0,
    };
  });

  return [{ groupName: "Conversions", groupOrder: 0, rows }];
}
