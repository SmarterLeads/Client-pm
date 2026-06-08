import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types/database";

import { platformSlugMatchesRow } from "./report-tab-platform";

type SB = SupabaseClient<Database>;

export type ContactFormAndPurchaseRawNames = {
  contactFormRawNames: Set<string>;
  purchaseRawNames: Set<string>;
};

/** @deprecated use ContactFormAndPurchaseRawNames */
export type MetaContactFormAndPurchaseRawNames = ContactFormAndPurchaseRawNames;

/** Contact Forms + purchase conversion raw names for a platform from `client_conversions`. */
export async function resolveContactFormAndPurchaseRawNames(
  supabase: SB,
  clientId: string,
  platformSlug: "meta" | "google",
): Promise<ContactFormAndPurchaseRawNames> {
  const contactFormRawNames = new Set<string>();
  const purchaseRawNames = new Set<string>();

  const { data: convConfigs, error } = await supabase
    .from("client_conversions")
    .select("raw_name, display_name, conversion_type, platform, is_active")
    .eq("client_id", clientId)
    .eq("is_active", true);
  if (error) {
    console.warn("[campaign-conversions] client_conversions:", error.message);
    return { contactFormRawNames, purchaseRawNames };
  }

  for (const c of convConfigs ?? []) {
    if (!platformSlugMatchesRow(c.platform ?? "", platformSlug)) continue;
    const raw = (c.raw_name ?? "").trim();
    if (!raw) continue;
    if ((c.display_name ?? "").trim() === "Contact Forms") contactFormRawNames.add(raw);
    if ((c.conversion_type ?? "").trim().toLowerCase() === "purchase") purchaseRawNames.add(raw);
  }

  return { contactFormRawNames, purchaseRawNames };
}

/** Meta conversion raw names — delegates to {@link resolveContactFormAndPurchaseRawNames}. */
export async function resolveMetaContactFormAndPurchaseRawNames(
  supabase: SB,
  clientId: string,
): Promise<ContactFormAndPurchaseRawNames> {
  return resolveContactFormAndPurchaseRawNames(supabase, clientId, "meta");
}

/** Google Ads conversion raw names — delegates to {@link resolveContactFormAndPurchaseRawNames}. */
export async function resolveGoogleContactFormAndPurchaseRawNames(
  supabase: SB,
  clientId: string,
): Promise<ContactFormAndPurchaseRawNames> {
  return resolveContactFormAndPurchaseRawNames(supabase, clientId, "google");
}

export function conversionRawNameList(names: ContactFormAndPurchaseRawNames): string[] {
  return Array.from(
    new Set([
      ...Array.from(names.contactFormRawNames),
      ...Array.from(names.purchaseRawNames),
    ]),
  );
}

/** @deprecated use conversionRawNameList */
export function metaConversionRawNameList(names: ContactFormAndPurchaseRawNames): string[] {
  return conversionRawNameList(names);
}
