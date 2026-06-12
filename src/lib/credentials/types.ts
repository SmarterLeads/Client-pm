export type ClientCredentialRow = {
  id: string;
  client_id: string;
  platform: string;
  url: string | null;
  username: string | null;
  password: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  created_by_name: string | null;
};

export type ClientCredentialsResult = {
  canView: boolean;
  credentials: ClientCredentialRow[];
};

export const CREDENTIAL_PLATFORM_PRESETS = [
  "Google Ads",
  "Meta Ads",
  "WordPress",
  "Shopify",
  "GHL",
  "WhatConverts",
  "GA4",
  "Microsoft Ads",
  "TikTok Ads",
  "LinkedIn",
  "Custom",
] as const;
