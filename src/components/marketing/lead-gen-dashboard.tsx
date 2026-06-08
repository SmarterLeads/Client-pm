"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  fetchAgencyClientTypeAvailability,
  fetchClientsForAgency,
} from "@/lib/queries/lead-gen-queries";
import {
  type DashboardClientType,
  leadGenKeys,
} from "@/lib/queries/lead-gen-query-keys";
import { createClient } from "@/lib/supabase/client";

import { ClientRow } from "@/components/marketing/client-row";
import { ClientRowSkeleton } from "@/components/marketing/skeletons";

const tabActiveClass =
  "border-zinc-200 bg-white text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";
const tabIdleClass =
  "border-transparent bg-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200";

function queryErrorMessage(err: unknown, fallback: string) {
  if (!err) return fallback;
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "object") {
    const e = err as { message?: string; code?: string; details?: string };
    const parts = [e.message, e.code ? `code ${e.code}` : null, e.details]
      .filter(Boolean)
      .join(" | ");
    if (parts) return parts;
  }
  if (typeof err === "string" && err.trim()) return err;
  return fallback;
}

export type MarketingDashboardAgency = { id: string; name: string };

type MarketingDashboardProps = {
  agencies: MarketingDashboardAgency[];
};

/**
 * Main dashboard: agency tabs (top), then optional Lead Gen / Ecommerce, then client list.
 */
export function MarketingDashboard({ agencies: agenciesFromServer }: MarketingDashboardProps) {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  const viewFromUrl = searchParams.get("view");
  const urlViewApplied = useRef(false);

  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [clientType, setClientType] = useState<DashboardClientType>("lead_gen");

  const agencies = useMemo(() => {
    const sorted = [...agenciesFromServer].sort((a, b) => {
      const aIsSmarter = a.name.trim().toLowerCase() === "smarter leads";
      const bIsSmarter = b.name.trim().toLowerCase() === "smarter leads";
      if (aIsSmarter && !bIsSmarter) return -1;
      if (!aIsSmarter && bIsSmarter) return 1;
      return a.name.localeCompare(b.name);
    });
    return sorted.slice(0, 4);
  }, [agenciesFromServer]);

  useEffect(() => {
    if (agencies.length > 0 && (!agencyId || !agencies.some((a) => a.id === agencyId))) {
      setAgencyId(agencies[0]!.id);
    }
  }, [agencies, agencyId]);

  const availabilityQuery = useQuery({
    queryKey: leadGenKeys.agencyClientTypes(agencyId ?? ""),
    queryFn: () => fetchAgencyClientTypeAvailability(supabase, agencyId!),
    enabled: Boolean(agencyId),
  });

  const availability = availabilityQuery.data;

  const effectiveClientType = useMemo((): DashboardClientType | null => {
    if (!availability) return null;
    const { hasLeadGen: L, hasEcommerce: E } = availability;
    if (L && E) return clientType;
    if (L) return "lead_gen";
    if (E) return "ecommerce";
    return null;
  }, [availability, clientType]);

  useEffect(() => {
    if (!availability) return;
    const { hasLeadGen: L, hasEcommerce: E } = availability;
    if (L && E) {
      setClientType((prev) => {
        if (prev === "ecommerce" && E) return "ecommerce";
        if (prev === "lead_gen" && L) return "lead_gen";
        return "lead_gen";
      });
    } else if (E && !L) {
      setClientType("ecommerce");
    } else if (L && !E) {
      setClientType("lead_gen");
    }
  }, [availability, agencyId]);

  useEffect(() => {
    urlViewApplied.current = false;
  }, [agencyId]);

  useEffect(() => {
    if (urlViewApplied.current) return;
    if (!viewFromUrl || !availability) return;
    if (viewFromUrl === "ecommerce" && availability.hasEcommerce) {
      setClientType("ecommerce");
      urlViewApplied.current = true;
    } else if (viewFromUrl === "lead_gen" && availability.hasLeadGen) {
      setClientType("lead_gen");
      urlViewApplied.current = true;
    }
  }, [viewFromUrl, availability]);

  const showSecondaryTabs = Boolean(availability?.hasLeadGen && availability.hasEcommerce);

  const clientsQuery = useQuery({
    queryKey: leadGenKeys.clients(agencyId ?? "", effectiveClientType ?? "lead_gen"),
    queryFn: () => fetchClientsForAgency(supabase, agencyId!, effectiveClientType!),
    enabled: Boolean(agencyId) && effectiveClientType != null,
  });

  if (agencies.length === 0) {
    return <p className="text-sm text-zinc-500">No agencies linked to your account yet.</p>;
  }

  return (
    <div className="space-y-5">
      <div className="overflow-x-auto border-b border-zinc-200 dark:border-zinc-800">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Agency
        </p>
        <div className="flex min-w-0 gap-1 pb-px" role="tablist" aria-label="Agencies">
          {agencies.map((a) => (
            <button
              key={a.id}
              type="button"
              role="tab"
              aria-selected={a.id === agencyId}
              onClick={() => setAgencyId(a.id)}
              className={`shrink-0 whitespace-nowrap rounded-t-lg border border-b-0 px-4 py-2.5 text-sm font-semibold transition ${
                a.id === agencyId ? tabActiveClass : tabIdleClass
              }`}
            >
              {a.name}
            </button>
          ))}
        </div>
      </div>

      {showSecondaryTabs ? (
        <div className="overflow-x-auto border-b border-zinc-200 dark:border-zinc-800">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Client type
          </p>
          <div className="flex min-w-0 gap-1 pb-px" role="tablist" aria-label="Client type">
            <button
              type="button"
              role="tab"
              aria-selected={clientType === "lead_gen"}
              onClick={() => setClientType("lead_gen")}
              className={`shrink-0 whitespace-nowrap rounded-t-lg border border-b-0 px-4 py-2.5 text-sm font-semibold transition ${
                clientType === "lead_gen" ? tabActiveClass : tabIdleClass
              }`}
            >
              Lead Gen
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={clientType === "ecommerce"}
              onClick={() => setClientType("ecommerce")}
              className={`shrink-0 whitespace-nowrap rounded-t-lg border border-b-0 px-4 py-2.5 text-sm font-semibold transition ${
                clientType === "ecommerce" ? tabActiveClass : tabIdleClass
              }`}
            >
              Ecommerce
            </button>
          </div>
        </div>
      ) : null}

      {availabilityQuery.isLoading && agencyId ? (
        <div className="space-y-2">
          <ClientRowSkeleton />
          <ClientRowSkeleton />
        </div>
      ) : availabilityQuery.isError ? (
        <p className="text-sm text-red-600">
          Could not load client type availability:{" "}
          {queryErrorMessage(availabilityQuery.error, "Unknown error")}
        </p>
      ) : availability && !availability.hasLeadGen && !availability.hasEcommerce ? (
        <p className="text-sm text-zinc-500">No active clients in this agency.</p>
      ) : clientsQuery.isLoading || effectiveClientType == null ? (
        <div className="space-y-2">
          <ClientRowSkeleton />
          <ClientRowSkeleton />
        </div>
      ) : clientsQuery.isError ? (
        <p className="text-sm text-red-600">
          Could not load clients: {queryErrorMessage(clientsQuery.error, "Unknown error")}
        </p>
      ) : (
        <div className="space-y-2">
          {(clientsQuery.data ?? []).map((c) => (
            <ClientRow
              key={c.id}
              client={{ id: c.id, name: c.name, leadQualityScore: c.lead_quality_score ?? null }}
              clientType={effectiveClientType}
            />
          ))}
          {(clientsQuery.data ?? []).length === 0 && effectiveClientType ? (
            <p className="text-sm text-zinc-500">No clients of this type in this agency.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

/** Alias used by the PM marketing overview page. */
export { MarketingDashboard as LeadGenDashboard };
