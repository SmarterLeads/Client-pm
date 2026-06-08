import type { MetaLocationBreakdownState } from "@/lib/report/meta-location-breakdown";

import { LocationBreakdownSection } from "./location-breakdown-section";

/** @deprecated use LocationBreakdownSection */
export function MetaLocationBreakdownSection({
  state,
}: {
  state: MetaLocationBreakdownState;
}) {
  return (
    <LocationBreakdownSection
      state={{ aggregate: state.facebook, locations: state.locations }}
    />
  );
}

export { LocationBreakdownSection } from "./location-breakdown-section";
