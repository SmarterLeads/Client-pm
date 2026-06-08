import type { SupabaseClient } from "@supabase/supabase-js";
import type { SidebarGroup } from "@/components/marketing/report/report-sidebar";
import type { Database } from "@/lib/types/database";

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDaysUTC(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function syncStatusFromDate(reportDate?: string): "green" | "amber" | "red" {
  if (!reportDate) return "red";
  const today = new Date(`${isoDate(new Date())}T00:00:00.000Z`);
  const date = new Date(`${reportDate}T00:00:00.000Z`);
  const diff = Math.floor((today.getTime() - date.getTime()) / 86400000);
  if (diff <= 0) return "green";
  if (diff === 1) return "amber";
  return "red";
}

/** Sidebar client list for PM team members — all active clients with report slugs. */
export async function fetchPmReportSidebarGroups(
  supabase: SupabaseClient<Database>,
  currentAgencyId: string,
): Promise<SidebarGroup[]> {
  const { data: clients, error: cErr } = await supabase
    .from("clients")
    .select("id, name, report_slug, agency_id")
    .not("report_slug", "is", null)
    .eq("status", "active")
    .order("name");

  if (cErr) throw cErr;

  const agencyIds = Array.from(
    new Set((clients ?? []).map((c) => c.agency_id).filter(Boolean)),
  );

  if (agencyIds.length === 0) return [];

  const { data: agencies, error: aErr } = await supabase
    .from("agencies")
    .select("id, name, primary_color")
    .in("id", agencyIds);

  if (aErr) throw aErr;

  const agencyById = new Map(
    (agencies ?? []).map((a) => [a.id, { name: a.name, primaryColor: a.primary_color }]),
  );

  const clientIds = (clients ?? []).map((c) => c.id);
  let perfRows: Array<{ client_id: string; report_date: string }> = [];

  if (clientIds.length > 0) {
    const { data, error } = await supabase
      .from("daily_performance")
      .select("client_id, report_date")
      .in("client_id", clientIds)
      .gte("report_date", isoDate(addDaysUTC(new Date(), -14)));

    if (error) throw error;
    perfRows = data ?? [];
  }

  const latestByClient = new Map<string, string>();
  for (const row of perfRows) {
    const prev = latestByClient.get(row.client_id);
    if (!prev || row.report_date > prev) latestByClient.set(row.client_id, row.report_date);
  }

  const groups = new Map<string, SidebarGroup>();
  for (const client of clients ?? []) {
    if (!client.report_slug?.trim()) continue;
    const agency = agencyById.get(client.agency_id);
    const agencyName = agency?.name ?? "Agency";
    const fallbackColor =
      agencyName.trim().toLowerCase() === "smarter leads" ? "#378ADD" : "#2563EB";
    const agencyPrimaryColor = agency?.primaryColor ?? fallbackColor;

    if (!groups.has(agencyName)) {
      groups.set(agencyName, {
        agencyName,
        agencyPrimaryColor,
        clients: [],
      });
    }

    groups.get(agencyName)!.clients.push({
      id: client.id,
      name: client.name,
      slug: client.report_slug.trim(),
      status: syncStatusFromDate(latestByClient.get(client.id)),
    });
  }

  let out = Array.from(groups.values()).sort((a, b) =>
    a.agencyName.localeCompare(b.agencyName),
  );
  out = out.map((g) => ({
    ...g,
    clients: g.clients.sort((a, b) => a.name.localeCompare(b.name)),
  }));

  const currentAgencyName = agencyById.get(currentAgencyId)?.name;
  if (currentAgencyName) {
    out = out.sort((a, b) =>
      a.agencyName === currentAgencyName ? -1 : b.agencyName === currentAgencyName ? 1 : 0,
    );
  }

  return out;
}
