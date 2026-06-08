export const ST_JAMES_CLIENT_ID = "95260a74-a007-47c4-b686-aa24b3d52024";

/** Google purchase conversion actions rolled up into one "Purchases" metric for St. James. */
export const ST_JAMES_COMBINED_GOOGLE_PURCHASE_EVENTS = [
  "Gads _ Purchase - 2025",
  "Google Shopping App Purchase",
  "Google Shopping App Purchase (1)",
] as const;

export const ST_JAMES_COMBINED_PURCHASE_LABEL = "Purchases";

export const ST_JAMES_COMBINED_PURCHASE_MERGE_BUCKET = "merge:st-james:google-purchases";

const ST_JAMES_PURCHASE_EVENT_LOOKUP = new Set(
  ST_JAMES_COMBINED_GOOGLE_PURCHASE_EVENTS.map((name) => name.trim().toLowerCase()),
);

export function isStJamesClient(clientId: string): boolean {
  return clientId === ST_JAMES_CLIENT_ID;
}

export function isStJamesCombinedGooglePurchaseEvent(
  rawName: string | null | undefined,
): boolean {
  return ST_JAMES_PURCHASE_EVENT_LOOKUP.has((rawName ?? "").trim().toLowerCase());
}

export function stJamesCombinedGooglePurchaseEventNames(clientId: string): string[] {
  if (!isStJamesClient(clientId)) return [];
  return [...ST_JAMES_COMBINED_GOOGLE_PURCHASE_EVENTS];
}
