import { Suspense } from "react";
import { MarketingDashboardShell } from "@/components/marketing/marketing-dashboard-shell";
import { SkeletonLine } from "@/components/marketing/skeletons";
import { fetchAgencies } from "@/lib/queries/lead-gen-queries";
import { createClient } from "@/lib/supabase/server";

export default async function MarketingOverviewPage() {
  const supabase = await createClient();
  const agencies = await fetchAgencies(supabase);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Weekly Internal Marketing Dashboard
        </h1>
      </div>
      <Suspense
        fallback={
          <div className="space-y-5">
            <SkeletonLine className="h-10 w-full max-w-md rounded-lg" />
            <SkeletonLine className="h-24 w-full rounded-lg" />
          </div>
        }
      >
        <MarketingDashboardShell agencies={agencies} />
      </Suspense>
    </div>
  );
}
