import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types/database";

import {
  fetchHudsonLocationBreakdown,
  type LocationBreakdownState,
} from "./hudson-location-breakdown";
import { resolveGoogleContactFormAndPurchaseRawNames } from "./meta-campaign-conversions";

type SB = SupabaseClient<Database>;

export const GOOGLE_SHOW_LOCATION_BREAKDOWN_KEY = "google_show_location_breakdown";

/** Hudson Table: Google Ads performance by location with YoY comparison. */
export async function fetchGoogleLocationBreakdown(
  supabase: SB,
  clientId: string,
  asOf: Date = new Date(),
): Promise<LocationBreakdownState> {
  const rawNames = await resolveGoogleContactFormAndPurchaseRawNames(supabase, clientId);
  return fetchHudsonLocationBreakdown(
    supabase,
    clientId,
    {
      platformSlug: "google",
      aggregateName: "Google",
      logPrefix: "[google-location-breakdown]",
      debugEnvVar: "GOOGLE_LOCATION_BREAKDOWN_DEBUG",
      contactFormRawNames: rawNames.contactFormRawNames,
      purchaseRawNames: rawNames.purchaseRawNames,
      filterDailyByPlatform: true,
    },
    asOf,
  );
}
