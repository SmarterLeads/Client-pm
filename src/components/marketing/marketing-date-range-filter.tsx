"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MARKETING_DATE_RANGE_LABELS } from "@/lib/marketing/date-range";
import {
  MARKETING_DATE_RANGES,
  type MarketingDateRange,
} from "@/lib/marketing/types";
import { cn } from "@/lib/utils";

type MarketingDateRangeFilterProps = {
  className?: string;
};

export function MarketingDateRangeFilter({
  className,
}: MarketingDateRangeFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current =
    (searchParams.get("range") as MarketingDateRange | null) ?? "this_month";

  function setRange(range: MarketingDateRange) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", range);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {MARKETING_DATE_RANGES.map((range) => (
        <button
          key={range}
          type="button"
          onClick={() => setRange(range)}
          className={cn(
            "rounded-lg border px-3 py-1.5 text-sm transition-colors",
            current === range
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-muted-foreground hover:text-foreground",
          )}
        >
          {MARKETING_DATE_RANGE_LABELS[range]}
        </button>
      ))}
    </div>
  );
}
