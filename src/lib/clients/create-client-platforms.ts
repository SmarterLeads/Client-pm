/** Platform account IDs collected on the new-client form. */
export const CREATE_CLIENT_PLATFORM_FIELDS = [
  {
    formKey: "platform_google",
    platform: "google",
    label: "Google Ads Account ID",
  },
  {
    formKey: "platform_meta",
    platform: "meta",
    label: "Meta Ad Account ID",
  },
  {
    formKey: "platform_microsoft",
    platform: "microsoft",
    label: "Microsoft Ads Account ID",
  },
  {
    formKey: "platform_tiktok",
    platform: "tiktok",
    label: "TikTok Advertiser ID",
  },
  {
    formKey: "whatconverts_profile_id",
    platform: "whatconverts",
    label: "WhatConverts Profile ID",
    syncClientProfileId: true,
  },
] as const;

export type CreateClientPlatformFormKey =
  (typeof CREATE_CLIENT_PLATFORM_FIELDS)[number]["formKey"];

export const CREATE_CLIENT_TYPE_OPTIONS = [
  { value: "lead_gen", label: "Lead Gen" },
  { value: "ecommerce", label: "Ecommerce" },
] as const;

export type CreateClientType =
  (typeof CREATE_CLIENT_TYPE_OPTIONS)[number]["value"];
