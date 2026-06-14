import {
  activeMrrBreakdownKeys,
  channelMrrCents,
  getMrrBreakdownItemLabel,
  parseMrrBreakdown,
} from "@/lib/clients/mrr-breakdown";
import { normalizeClientCurrency } from "@/lib/clients/overview-fields";
import { createClient } from "@/lib/supabase/server";
import { buildMonthlyFinancialRow } from "@/lib/business-dashboard/financials";
import type {
  BusinessDashboardAgencyRow,
  BusinessDashboardKpis,
  BusinessDashboardMonthlyResultRow,
  BusinessDashboardMrrServiceRow,
  BusinessDashboardServiceRow,
  MonthlyFinancialRow,
} from "@/lib/business-dashboard/types";
import { pm } from "@/lib/supabase/pm";

export type {
  BusinessDashboardAgencyRow,
  BusinessDashboardKpis,
  BusinessDashboardMonthlyResultRow,
  BusinessDashboardMrrServiceRow,
  BusinessDashboardServiceRow,
  MonthlyFinancialRow,
} from "@/lib/business-dashboard/types";

const USD_TO_CAD_RATE = 1.35;

const AGENCY_DISPLAY_ORDER: Record<string, number> = {
  "Smarter Leads": 1,
  "Zev Media": 2,
  "Blue Flamingo": 3,
  "Napkin Marketing": 4,
};

function agencyDisplayOrder(name: string): number {
  return AGENCY_DISPLAY_ORDER[name] ?? 5;
}

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

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(monthStart: Date): Date {
  return new Date(
    monthStart.getFullYear(),
    monthStart.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );
}

function formatMonthLabel(monthStart: Date): string {
  return monthStart.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function buildMonthlyRange(
  earliestCreatedAt: Date | null,
  maxMonths = 12,
): Date[] {
  const currentMonthStart = startOfMonth(new Date());
  const rangeFloor = new Date(
    currentMonthStart.getFullYear(),
    currentMonthStart.getMonth() - (maxMonths - 1),
    1,
  );

  let rangeStart = rangeFloor;
  if (earliestCreatedAt) {
    const earliestMonth = startOfMonth(earliestCreatedAt);
    if (earliestMonth > rangeStart) {
      rangeStart = earliestMonth;
    }
  }

  const months: Date[] = [];
  let cursor = new Date(currentMonthStart);

  while (cursor >= rangeStart && months.length < maxMonths) {
    months.push(new Date(cursor));
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
  }

  return months;
}

export async function getMonthlyBusinessResults(): Promise<
  BusinessDashboardMonthlyResultRow[]
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("clients")
    .select("id, status, created_at, updated_at, mrr_cents, currency");

  if (error) throw new Error(error.message);

  const clients = data ?? [];
  const currentMonthStart = startOfMonth(new Date());
  const currentActiveMrrCadCents = clients.reduce((sum, client) => {
    if (client.status !== "active") return sum;
    return (
      sum +
      mrrCentsToCad(
        client.mrr_cents ?? 0,
        normalizeClientCurrency(client.currency),
      )
    );
  }, 0);

  const earliestCreatedAt =
    clients.length > 0
      ? clients.reduce((earliest, client) => {
          const createdAt = new Date(client.created_at);
          return createdAt < earliest ? createdAt : earliest;
        }, new Date(clients[0]!.created_at))
      : null;

  return buildMonthlyRange(earliestCreatedAt).map((monthStart) => {
    const monthEnd = endOfMonth(monthStart);
    const nextMonthStart = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth() + 1,
      1,
    );

    let activeClients = 0;
    let newClients = 0;
    let churnedClients = 0;

    for (const client of clients) {
      const createdAt = new Date(client.created_at);
      const updatedAt = new Date(client.updated_at);

      if (createdAt >= monthStart && createdAt < nextMonthStart) {
        newClients += 1;
      }

      if (
        client.status === "churned" &&
        updatedAt >= monthStart &&
        updatedAt < nextMonthStart
      ) {
        churnedClients += 1;
      }

      if (
        createdAt <= monthEnd &&
        (client.status === "active" || updatedAt > monthEnd)
      ) {
        activeClients += 1;
      }
    }

    return {
      monthStart: monthStart.toISOString(),
      monthLabel: formatMonthLabel(monthStart),
      activeClients,
      totalMrrCadCents: currentActiveMrrCadCents,
      newClients,
      churnedClients,
      isCurrentMonth: monthStart.getTime() === currentMonthStart.getTime(),
    };
  });
}

export async function getBusinessDashboardKpis(): Promise<BusinessDashboardKpis> {
  const supabase = await createClient();

  const [activeRes, newClientsRes, churnedRes] = await Promise.all([
    supabase
      .from("clients")
      .select("mrr_cents, currency")
      .eq("status", "active"),
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .in("status", ["active", "prospect"])
      .gte("created_at", thirtyDaysAgoIso()),
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("status", "churned")
      .gte("updated_at", thirtyDaysAgoIso()),
  ]);

  if (activeRes.error) throw new Error(activeRes.error.message);
  if (newClientsRes.error) throw new Error(newClientsRes.error.message);
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
    newClientsLast30Days: newClientsRes.count ?? 0,
    churnedLast30Days: churnedRes.count ?? 0,
  };
}

export async function getActiveClientsByService(): Promise<
  BusinessDashboardServiceRow[]
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("clients")
    .select("marketing_channels, tracking_setup")
    .eq("status", "active");

  if (error) throw new Error(error.message);

  const counts = new Map<string, number>();

  for (const client of data ?? []) {
    for (const channel of activeMrrBreakdownKeys(
      client.marketing_channels,
      client.tracking_setup,
    )) {
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
    .select("mrr_breakdown, currency, marketing_channels, tracking_setup")
    .eq("status", "active");

  if (error) throw new Error(error.message);

  const totals = new Map<
    string,
    { mrrCadCents: number; clientCount: number }
  >();

  for (const client of data ?? []) {
    const currency = normalizeClientCurrency(client.currency);
    const breakdown = parseMrrBreakdown(client.mrr_breakdown);

    for (const channel of activeMrrBreakdownKeys(
      client.marketing_channels,
      client.tracking_setup,
    )) {
      const cents = channelMrrCents(breakdown, channel);
      if (cents <= 0) continue;
      const cadCents = mrrCentsToCad(cents, currency);
      const row = totals.get(channel) ?? { mrrCadCents: 0, clientCount: 0 };
      row.mrrCadCents += cadCents;
      row.clientCount += 1;
      totals.set(channel, row);
    }
  }

  return [...totals.entries()]
    .filter(([, row]) => row.mrrCadCents > 0)
    .map(([channel, row]) => ({
      channel,
      label: getMrrBreakdownItemLabel(channel),
      mrrCadCents: row.mrrCadCents,
      clientCount: row.clientCount,
      averageMrrCadCents: Math.round(row.mrrCadCents / row.clientCount),
    }))
    .sort((a, b) => b.mrrCadCents - a.mrrCadCents);
}

export async function getMrrByAgency(): Promise<BusinessDashboardAgencyRow[]> {
  const supabase = await createClient();
  const churnedSince = thirtyDaysAgoIso();

  const [agenciesRes, clientsRes] = await Promise.all([
    supabase.from("agencies").select("id, name, primary_color"),
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

  return (agenciesRes.data ?? [])
    .map((agency) => {
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
    })
    .sort((a, b) => {
      const orderDiff = agencyDisplayOrder(a.name) - agencyDisplayOrder(b.name);
      if (orderDiff !== 0) return orderDiff;
      return a.name.localeCompare(b.name);
    });
}

export async function getMonthlyFinancials(
  year: number,
): Promise<MonthlyFinancialRow[]> {
  const supabase = await createClient();

  const { data, error } = await pm(supabase)
    .from("monthly_financials")
    .select(
      "month, cdn_sales_cents, cdn_exp_cents, us_sales_cents, us_exp_cents",
    )
    .eq("year", year)
    .order("month");

  if (error) {
    console.error("[getMonthlyFinancials] error:", error.message);
    throw new Error(error.message);
  }

  const byMonth = new Map(
    (data ?? []).map((row) => [
      row.month,
      {
        cdnSalesCents: row.cdn_sales_cents ?? 0,
        cdnExpCents: row.cdn_exp_cents ?? 0,
        usSalesCents: row.us_sales_cents ?? 0,
        usExpCents: row.us_exp_cents ?? 0,
      },
    ]),
  );

  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    return buildMonthlyFinancialRow(month, byMonth.get(month));
  });
}
