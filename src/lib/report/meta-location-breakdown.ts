import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types/database";

import {
  fetchHudsonLocationBreakdown,
  type LocationBreakdownState,
  type LocationComparePair,
  type LocationBreakdownTable,
  type LocationMonthRow,
} from "./hudson-location-breakdown";
import { resolveMetaContactFormAndPurchaseRawNames } from "./meta-campaign-conversions";

type SB = SupabaseClient<Database>;

export const META_SHOW_LOCATION_BREAKDOWN_KEY = "meta_show_location_breakdown";

export type MetaLocationMonthRow = LocationMonthRow;
export type MetaLocationBreakdownTable = LocationBreakdownTable;
export type MetaLocationComparePair = LocationComparePair;

export type MetaLocationBreakdownState = {
  facebook: MetaLocationComparePair | null;
  locations: MetaLocationComparePair[];
};

function toMetaState(state: LocationBreakdownState): MetaLocationBreakdownState {
  return { facebook: state.aggregate, locations: state.locations };
}

/** Hudson Table: Meta performance by location with YoY comparison. */
export async function fetchMetaLocationBreakdown(
  supabase: SB,
  clientId: string,
  asOf: Date = new Date(),
): Promise<MetaLocationBreakdownState> {
  const rawNames = await resolveMetaContactFormAndPurchaseRawNames(supabase, clientId);
  const state = await fetchHudsonLocationBreakdown(
    supabase,
    clientId,
    {
      platformSlug: "meta",
      aggregateName: "Facebook",
      logPrefix: "[meta-location-breakdown]",
      debugEnvVar: "META_LOCATION_BREAKDOWN_DEBUG",
      contactFormRawNames: rawNames.contactFormRawNames,
      purchaseRawNames: rawNames.purchaseRawNames,
      filterDailyByPlatform: false,
    },
    asOf,
  );
  return toMetaState(state);
}

export { campaignMatchesLocation, HUDSON_LOCATIONS } from "./hudson-location-breakdown";
