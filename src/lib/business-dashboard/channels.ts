const CHANNEL_ACCENT_COLORS: Record<string, string> = {
  google_ads: "#3b82f6",
  meta_ads: "#6366f1",
  microsoft_ads: "#0ea5e9",
  tiktok_ads: "#ec4899",
  seo: "#10b981",
  linkedin_ads: "#06b6d4",
  email_marketing: "#10b981",
  website_maintenance: "#8b5cf6",
  ga4: "#f59e0b",
  ghl: "#f97316",
  whatconverts: "#14b8a6",
};

const DEFAULT_CHANNEL_ACCENT = "#64748b";

export function marketingChannelAccentColor(channel: string): string {
  return CHANNEL_ACCENT_COLORS[channel] ?? DEFAULT_CHANNEL_ACCENT;
}
