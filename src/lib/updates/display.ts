/** Channel options when a client has no marketing_channels configured. */
export const DEFAULT_UPDATE_CHANNEL_OPTIONS = [
  { value: "google_ads", label: "Google Ads" },
  { value: "meta_ads", label: "Meta Ads" },
  { value: "microsoft_ads", label: "Microsoft Ads" },
  { value: "tiktok_ads", label: "TikTok Ads" },
  { value: "seo", label: "SEO" },
  { value: "linkedin_ads", label: "LinkedIn Ads" },
  { value: "email_marketing", label: "Email Marketing" },
  { value: "website_maintenance", label: "Website Maintenance" },
  { value: "ga4", label: "GA4" },
  { value: "ghl", label: "GHL" },
  { value: "other", label: "Other" },
] as const;

const CHANNEL_LABELS: Record<string, string> = Object.fromEntries(
  DEFAULT_UPDATE_CHANNEL_OPTIONS.map((o) => [o.value, o.label]),
);

/** Badge colour classes keyed by channel value (or "other_custom" for Other: …). */
const CHANNEL_BADGE_CLASSES: Record<string, string> = {
  google_ads: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  meta_ads: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200",
  microsoft_ads: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  tiktok_ads: "bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-200",
  seo: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  linkedin_ads: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200",
  email_marketing:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  website_maintenance:
    "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
  ga4: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  ghl: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
  other: "bg-muted text-muted-foreground",
  other_custom: "bg-muted text-muted-foreground",
};

export function getUpdateChannelOptionsForClient(
  marketingChannels: string[] | null | undefined,
) {
  const configured = marketingChannels ?? [];
  if (configured.length === 0) {
    return [...DEFAULT_UPDATE_CHANNEL_OPTIONS];
  }

  const options = configured.map((value) => ({
    value,
    label: CHANNEL_LABELS[value] ?? value.replace(/_/g, " "),
  }));

  if (!options.some((o) => o.value === "other")) {
    options.push({ value: "other", label: "Other" });
  }

  return options;
}

export function formatStoredUpdateChannel(stored: string): {
  label: string;
  badgeKey: string;
  isCustomOther: boolean;
} {
  if (stored.startsWith("Other: ")) {
    return {
      label: stored.slice("Other: ".length),
      badgeKey: "other_custom",
      isCustomOther: true,
    };
  }

  return {
    label: CHANNEL_LABELS[stored] ?? stored.replace(/_/g, " "),
    badgeKey: stored in CHANNEL_BADGE_CLASSES ? stored : "other",
    isCustomOther: false,
  };
}

export function getUpdateChannelBadgeClass(badgeKey: string): string {
  return (
    CHANNEL_BADGE_CLASSES[badgeKey] ??
    "bg-secondary text-secondary-foreground"
  );
}

export function buildStoredMarketingChannel(
  channel: string,
  otherDetail: string | null | undefined,
): string {
  if (channel === "other") {
    const detail = otherDetail?.trim();
    if (!detail) {
      throw new Error("Specify the update type when selecting Other.");
    }
    return `Other: ${detail}`;
  }
  return channel;
}

export function formatUpdateDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatUpdateDateCompact(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function plainTextUpdateSummary(summary: string): string {
  return summary
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}
