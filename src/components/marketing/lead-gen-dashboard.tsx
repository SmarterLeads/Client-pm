"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import {
  fetchAgencyClientTypeAvailability,
  fetchDashboardClients,
} from "@/lib/queries/lead-gen-queries";
import {
  ALL_AGENCIES_FILTER,
  ALL_CLIENT_TYPES_FILTER,
  type DashboardAgencyFilter,
  type DashboardClientType,
  type DashboardClientTypeFilter,
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

function sortAgencyTabs(agencies: MarketingDashboardAgency[]) {
  return [...agencies]
    .sort((a, b) => {
      const aIsSmarter = a.name.trim().toLowerCase() === "smarter leads";
      const bIsSmarter = b.name.trim().toLowerCase() === "smarter leads";
      if (aIsSmarter && !bIsSmarter) return -1;
      if (!aIsSmarter && bIsSmarter) return 1;
      return a.name.localeCompare(b.name);
    })
    .slice(0, 4);
}

function parseAgencyFilter(
  raw: string | null,
  agencyTabs: MarketingDashboardAgency[],
  allAgencyIds: string[],
): DashboardAgencyFilter {
  if (!raw || raw === ALL_AGENCIES_FILTER) return ALL_AGENCIES_FILTER;
  if (allAgencyIds.includes(raw)) return raw;
  if (agencyTabs.some((a) => a.id === raw)) return raw;
  return ALL_AGENCIES_FILTER;
}

function parseClientTypeFilter(
  typeRaw: string | null,
  viewRaw: string | null,
): DashboardClientTypeFilter {
  const raw = typeRaw ?? viewRaw;
  if (!raw || raw === ALL_CLIENT_TYPES_FILTER) return ALL_CLIENT_TYPES_FILTER;
  if (raw === "lead_gen" || raw === "ecommerce") return raw;
  return ALL_CLIENT_TYPES_FILTER;
}

function rowClientType(clientType: string): DashboardClientType {
  return clientType === "ecommerce" ? "ecommerce" : "lead_gen";
}

export type MarketingDashboardAgency = { id: string; name: string };

type MarketingDashboardProps = {
  agencies: MarketingDashboardAgency[];
  includePaused?: boolean;
  includeChurned?: boolean;
};

/**
 * Main dashboard: agency tabs (top), then optional Lead Gen / Ecommerce, then client list.
 */
export function MarketingDashboard({
  agencies: agenciesFromServer,
  includePaused = false,
  includeChurned = false,
}: MarketingDashboardProps) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const pathname = usePathname() ?? "/marketing";
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const searchParamsString = searchParams.toString();

  const agencyTabs = useMemo(() => sortAgencyTabs(agenciesFromServer), [agenciesFromServer]);
  const allAgencyIds = useMemo(
    () => agenciesFromServer.map((a) => a.id),
    [agenciesFromServer],
  );
  const agencyNameById = useMemo(
    () => new Map(agenciesFromServer.map((a) => [a.id, a.name])),
    [agenciesFromServer],
  );

  const selectedAgency = parseAgencyFilter(
    new URLSearchParams(searchParamsString).get("agency"),
    agencyTabs,
    allAgencyIds,
  );
  const clientTypeFilter = parseClientTypeFilter(
    new URLSearchParams(searchParamsString).get("type"),
    new URLSearchParams(searchParamsString).get("view"),
  );

  const replaceSearchParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParamsString);
      mutate(params);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParamsString],
  );

  const selectAgency = useCallback(
    (agencyId: DashboardAgencyFilter) => {
      replaceSearchParams((params) => {
        if (agencyId === ALL_AGENCIES_FILTER) {
          params.delete("agency");
        } else {
          params.set("agency", agencyId);
        }
      });
    },
    [replaceSearchParams],
  );

  const selectClientType = useCallback(
    (clientType: DashboardClientTypeFilter) => {
      replaceSearchParams((params) => {
        if (clientType === ALL_CLIENT_TYPES_FILTER) {
          params.delete("type");
          params.delete("view");
        } else {
          params.set("type", clientType);
          params.delete("view");
        }
      });
    },
    [replaceSearchParams],
  );

  function toggleIncludePaused(checked: boolean) {
    replaceSearchParams((params) => {
      if (checked) {
        params.set("show_paused", "true");
      } else {
        params.delete("show_paused");
      }
    });
  }

  function toggleIncludeChurned(checked: boolean) {
    replaceSearchParams((params) => {
      if (checked) {
        params.set("include_churned", "true");
      } else {
        params.delete("include_churned");
      }
    });
  }

  const availabilityQuery = useQuery({
    queryKey: leadGenKeys.agencyClientTypes(
      selectedAgency,
      includePaused,
      includeChurned,
    ),
    queryFn: () =>
      fetchAgencyClientTypeAvailability(
        supabase,
        selectedAgency,
        includePaused,
        allAgencyIds,
        includeChurned,
      ),
    enabled: allAgencyIds.length > 0,
  });

  const availability = availabilityQuery.data;

  const clientsQuery = useQuery({
    queryKey: leadGenKeys.clients(
      selectedAgency,
      clientTypeFilter,
      includePaused,
      includeChurned,
    ),
    queryFn: () =>
      fetchDashboardClients(supabase, {
        agencyId: selectedAgency,
        agencyIds: allAgencyIds,
        clientType: clientTypeFilter,
        includePaused,
        includeChurned,
      }),
    enabled: allAgencyIds.length > 0,
  });

  const showTypeTabs = Boolean(availability?.hasLeadGen || availability?.hasEcommerce);
  const showAgencyBadges = selectedAgency === ALL_AGENCIES_FILTER;

  if (agenciesFromServer.length === 0) {
    return <p className="text-sm text-zinc-500">No agencies linked to your account yet.</p>;
  }

  return (
    <div className="space-y-5">
      <div className="overflow-x-auto border-b border-zinc-200 dark:border-zinc-800">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Agency
        </p>
        <div className="flex min-w-0 gap-1 pb-px" role="tablist" aria-label="Agencies">
          <button
            type="button"
            role="tab"
            aria-selected={selectedAgency === ALL_AGENCIES_FILTER}
            onClick={() => selectAgency(ALL_AGENCIES_FILTER)}
            className={`shrink-0 whitespace-nowrap rounded-t-lg border border-b-0 px-4 py-2.5 text-sm font-semibold transition ${
              selectedAgency === ALL_AGENCIES_FILTER ? tabActiveClass : tabIdleClass
            }`}
          >
            All Agencies
          </button>
          {agencyTabs.map((a) => (
            <button
              key={a.id}
              type="button"
              role="tab"
              aria-selected={a.id === selectedAgency}
              onClick={() => selectAgency(a.id)}
              className={`shrink-0 whitespace-nowrap rounded-t-lg border border-b-0 px-4 py-2.5 text-sm font-semibold transition ${
                a.id === selectedAgency ? tabActiveClass : tabIdleClass
              }`}
            >
              {a.name}
            </button>
          ))}
        </div>
      </div>

      {showTypeTabs ? (
        <div className="overflow-x-auto border-b border-zinc-200 dark:border-zinc-800">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Client type
          </p>
          <div className="flex min-w-0 gap-1 pb-px" role="tablist" aria-label="Client type">
            <button
              type="button"
              role="tab"
              aria-selected={clientTypeFilter === ALL_CLIENT_TYPES_FILTER}
              onClick={() => selectClientType(ALL_CLIENT_TYPES_FILTER)}
              className={`shrink-0 whitespace-nowrap rounded-t-lg border border-b-0 px-4 py-2.5 text-sm font-semibold transition ${
                clientTypeFilter === ALL_CLIENT_TYPES_FILTER ? tabActiveClass : tabIdleClass
              }`}
            >
              All Types
            </button>
            {availability?.hasLeadGen ? (
              <button
                type="button"
                role="tab"
                aria-selected={clientTypeFilter === "lead_gen"}
                onClick={() => selectClientType("lead_gen")}
                className={`shrink-0 whitespace-nowrap rounded-t-lg border border-b-0 px-4 py-2.5 text-sm font-semibold transition ${
                  clientTypeFilter === "lead_gen" ? tabActiveClass : tabIdleClass
                }`}
              >
                Lead Gen
              </button>
            ) : null}
            {availability?.hasEcommerce ? (
              <button
                type="button"
                role="tab"
                aria-selected={clientTypeFilter === "ecommerce"}
                onClick={() => selectClientType("ecommerce")}
                className={`shrink-0 whitespace-nowrap rounded-t-lg border border-b-0 px-4 py-2.5 text-sm font-semibold transition ${
                  clientTypeFilter === "ecommerce" ? tabActiveClass : tabIdleClass
                }`}
              >
                Ecommerce
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {availabilityQuery.isLoading ? (
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
        <p className="text-sm text-zinc-500">
          No{" "}
          {includePaused && includeChurned
            ? "active, paused, or churned"
            : includePaused
              ? "active or paused"
              : includeChurned
                ? "active or churned"
                : "active"}{" "}
          clients match the current filters.
        </p>
      ) : clientsQuery.isLoading ? (
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
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <input
                type="checkbox"
                checked={includePaused}
                onChange={(e) => toggleIncludePaused(e.target.checked)}
                className="size-4 rounded border-input"
              />
              Show paused clients
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <input
                type="checkbox"
                checked={includeChurned}
                onChange={(e) => toggleIncludeChurned(e.target.checked)}
                className="size-4 rounded border-input"
              />
              Show churned
            </label>
          </div>
          {(clientsQuery.data ?? []).map((c) => (
            <ClientRow
              key={c.id}
              client={{ id: c.id, name: c.name, leadQualityScore: c.lead_quality_score ?? null }}
              clientType={rowClientType(c.client_type)}
              agencyName={
                showAgencyBadges ? agencyNameById.get(c.agency_id) ?? "Unknown agency" : undefined
              }
            />
          ))}
          {(clientsQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-zinc-500">No clients match the current filters.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

/** Alias used by the PM marketing overview page. */
export { MarketingDashboard as LeadGenDashboard };
