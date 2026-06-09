import { getMrrBreakdownItemLabel, parseMrrBreakdown } from "@/lib/clients/mrr-breakdown";
import { normalizeClientCurrency } from "@/lib/clients/overview-fields";
import { createClient } from "@/lib/supabase/server";
import type {
  BusinessDashboardAgencyRow,
  BusinessDashboardKpis,
  BusinessDashboardMrrServiceRow,
  BusinessDashboardServiceRow,
} from "@/lib/business-dashboard/types";

export type {
  BusinessDashboardAgencyRow,
  BusinessDashboardKpis,
  BusinessDashboardMrrServiceRow,
  BusinessDashboardServiceRow,
} from "@/lib/business-dashboard/types";

const USD_TO_CAD_RATE = 1.35;

function mrrCentsToCad(cents: number, currency: string): number {
  if (currency === "USD") {
    return Math.round(cents * USD_TO_CAD_RATE);
  }
  return cents;
}

function thirtyDaysAgoIso() {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString();
}

export async function getBusinessDashboardKpis(): Promise<BusinessDashboardKpis> {
  const supabase = await createClient();

  const [activeRes, churnedRes] = await Promise.all([
    supabase
      .from("clients")
      .select("mrr_cents, currency")
      .eq("status", "active"),
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("status", "churned")
      .gte("updated_at", thirtyDaysAgoIso()),
  ]);

  if (activeRes.error) throw new Error(activeRes.error.message);
  if (churnedRes.error) throw new Error(churnedRes.error.message);

  const activeClients = activeRes.data ?? [];
  const totalMrrCadCents = activeClients.reduce(
    (sum, client) =>
      sum +
      mrrCentsToCad(
        client.mrr_cents ?? 0,
        normalizeClientCurrency(client.currency),
      ),
    0,
  );

  const count = activeClients.length;

  return {
    activeClients: count,
    totalMrrCadCents,
    averageMrrCadCents: count > 0 ? Math.round(totalMrrCadCents / count) : null,
    churnedLast30Days: churnedRes.count ?? 0,
  };
}

export async function getActiveClientsByService(): Promise<
  BusinessDashboardServiceRow[]
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("clients")
    .select("marketing_channels")
    .eq("status", "active");

  if (error) throw new Error(error.message);

  const counts = new Map<string, number>();

  for (const client of data ?? []) {
    for (const channel of client.marketing_channels ?? []) {
      if (!channel) continue;
      counts.set(channel, (counts.get(channel) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([channel, clientCount]) => ({
      channel,
      label: getMrrBreakdownItemLabel(channel),
      clientCount,
    }))
    .sort((a, b) => b.clientCount - a.clientCount);
}

export async function getMrrByService(): Promise<BusinessDashboardMrrServiceRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("clients")
    .select("mrr_breakdown, currency")
    .eq("status", "active");

  if (error) throw new Error(error.message);

  const totals = new Map<string, number>();

  for (const client of data ?? []) {
    const currency = normalizeClientCurrency(client.currency);
    const breakdown = parseMrrBreakdown(client.mrr_breakdown);

    for (const [channel, cents] of Object.entries(breakdown)) {
      if (!channel || cents <= 0) continue;
      const cadCents = mrrCentsToCad(cents, currency);
      totals.set(channel, (totals.get(channel) ?? 0) + cadCents);
    }
  }

  return [...totals.entries()]
    .map(([channel, mrrCadCents]) => ({
      channel,
      label: getMrrBreakdownItemLabel(channel),
      mrrCadCents,
    }))
    .sort((a, b) => b.mrrCadCents - a.mrrCadCents);
}

export async function getMrrByAgency(): Promise<BusinessDashboardAgencyRow[]> {
  const supabase = await createClient();
  const churnedSince = thirtyDaysAgoIso();

  const [agenciesRes, clientsRes] = await Promise.all([
    supabase
      .from("agencies")
      .select("id, name, primary_color")
      .order("name"),
    supabase
      .from("clients")
      .select("agency_id, status, mrr_cents, currency, updated_at"),
  ]);

  if (agenciesRes.error) throw new Error(agenciesRes.error.message);
  if (clientsRes.error) throw new Error(clientsRes.error.message);

  const stats = new Map<
    string,
    {
      activeClients: number;
      totalMrrCadCents: number;
      churnedLast30Days: number;
    }
  >();

  for (const client of clientsRes.data ?? []) {
    if (!client.agency_id) continue;

    const row = stats.get(client.agency_id) ?? {
      activeClients: 0,
      totalMrrCadCents: 0,
      churnedLast30Days: 0,
    };

    if (client.status === "active") {
      row.activeClients += 1;
      row.totalMrrCadCents += mrrCentsToCad(
        client.mrr_cents ?? 0,
        normalizeClientCurrency(client.currency),
      );
    } else if (
      client.status === "churned" &&
      client.updated_at >= churnedSince
    ) {
      row.churnedLast30Days += 1;
    }

    stats.set(client.agency_id, row);
  }

  return (agenciesRes.data ?? []).map((agency) => {
    const row = stats.get(agency.id) ?? {
      activeClients: 0,
      totalMrrCadCents: 0,
      churnedLast30Days: 0,
    };

    return {
      id: agency.id,
      name: agency.name,
      primaryColor: agency.primary_color,
      activeClients: row.activeClients,
      totalMrrCadCents: row.totalMrrCadCents,
      averageMrrCadCents:
        row.activeClients > 0
          ? Math.round(row.totalMrrCadCents / row.activeClients)
          : null,
      churnedLast30Days: row.churnedLast30Days,
    };
  });
}
