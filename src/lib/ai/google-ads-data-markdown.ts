import { dateInRange, type WeekRange } from "@/lib/ai/weekly-insights-weeks";

type CampaignRow = {
  report_date: string;
  campaign_id: string;
  spend_cents: number | null;
  clicks: number | null;
  impressions: number | null;
  conversions: number | null;
};

type SearchTermRow = {
  search_term: string;
  report_date: string;
  spend_cents: number;
  clicks: number;
  impressions: number;
  conversions: number;
  campaign_name: string;
};

type ConversionRow = {
  occurred_on: string;
  event_name: string;
  event_count: number;
};

type CampaignMeta = { id: string; campaign_name: string };

type Metrics = {
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
};

function emptyMetrics(): Metrics {
  return { spend: 0, clicks: 0, impressions: 0, conversions: 0 };
}

function addCampaignRow(m: Metrics, row: CampaignRow) {
  m.spend += (row.spend_cents ?? 0) / 100;
  m.clicks += row.clicks ?? 0;
  m.impressions += row.impressions ?? 0;
  m.conversions += row.conversions ?? 0;
}

function fmtMoney(n: number): string {
  return `$${n.toFixed(2)}`;
}

function fmtNum(n: number): string {
  return n.toLocaleString("en-US");
}

function pctChange(current: number, previous: number): string {
  if (previous === 0) {
    return current === 0 ? "0%" : "—";
  }
  const pct = ((current - previous) / previous) * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

function weekLabel(start: string, end: string): string {
  return `${start} – ${end}`;
}

function aggregateCampaignRows(
  rows: CampaignRow[],
  start: string,
  end: string,
): Metrics {
  const m = emptyMetrics();
  for (const row of rows) {
    if (dateInRange(row.report_date, start, end)) {
      addCampaignRow(m, row);
    }
  }
  return m;
}

function listWeekStarts(trendStart: string, weekEnd: string): string[] {
  const starts: string[] = [];
  let cur = trendStart;
  while (cur <= weekEnd) {
    starts.push(cur);
    const d = new Date(`${cur}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + 7);
    cur = d.toISOString().slice(0, 10);
  }
  return starts.slice(0, 5);
}

export function buildGoogleAdsDataMarkdown(
  weeks: WeekRange,
  campaignRows: CampaignRow[],
  searchTermRows: SearchTermRow[],
  conversionRows: ConversionRow[],
  campaigns: CampaignMeta[],
): string {
  const current = aggregateCampaignRows(
    campaignRows,
    weeks.weekStart,
    weeks.weekEnd,
  );
  const previous = aggregateCampaignRows(
    campaignRows,
    weeks.prevWeekStart,
    weeks.prevWeekEnd,
  );

  const convCurrent = conversionRows
    .filter((r) => dateInRange(r.occurred_on, weeks.weekStart, weeks.weekEnd))
    .reduce((s, r) => s + r.event_count, 0);
  const convPrevious = conversionRows
    .filter((r) =>
      dateInRange(r.occurred_on, weeks.prevWeekStart, weeks.prevWeekEnd),
    )
    .reduce((s, r) => s + r.event_count, 0);

  const nameById = new Map(campaigns.map((c) => [c.id, c.campaign_name]));

  const lines: string[] = [];
  lines.push("## Google Ads performance data");
  lines.push("");
  lines.push("### Account summary (current week vs previous week)");
  lines.push("");
  lines.push(
    `Reporting weeks (UTC): **Current** ${weekLabel(weeks.weekStart, weeks.weekEnd)} | **Previous** ${weekLabel(weeks.prevWeekStart, weeks.prevWeekEnd)}`,
  );
  lines.push("");
  lines.push("| Metric | Current week | Previous week | Change |");
  lines.push("| --- | ---: | ---: | ---: |");
  lines.push(
    `| Spend | ${fmtMoney(current.spend)} | ${fmtMoney(previous.spend)} | ${pctChange(current.spend, previous.spend)} |`,
  );
  lines.push(
    `| Clicks | ${fmtNum(current.clicks)} | ${fmtNum(previous.clicks)} | ${pctChange(current.clicks, previous.clicks)} |`,
  );
  lines.push(
    `| Impressions | ${fmtNum(current.impressions)} | ${fmtNum(previous.impressions)} | ${pctChange(current.impressions, previous.impressions)} |`,
  );
  lines.push(
    `| Platform conversions (events) | ${fmtNum(convCurrent)} | ${fmtNum(convPrevious)} | ${pctChange(convCurrent, convPrevious)} |`,
  );
  lines.push(
    `| Campaign-reported conversions | ${fmtNum(current.conversions)} | ${fmtNum(previous.conversions)} | ${pctChange(current.conversions, previous.conversions)} |`,
  );
  lines.push("");

  lines.push("### 5-week trend (weekly totals)");
  lines.push("");
  lines.push("| Week (Mon start) | Spend | Clicks | Impressions | Conversions |");
  lines.push("| --- | ---: | ---: | ---: | ---: |");

  for (const ws of listWeekStarts(weeks.trendStart, weeks.weekEnd)) {
    const d = new Date(`${ws}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + 6);
    const we = d.toISOString().slice(0, 10);
    const w = aggregateCampaignRows(campaignRows, ws, we);
    lines.push(
      `| ${ws} | ${fmtMoney(w.spend)} | ${fmtNum(w.clicks)} | ${fmtNum(w.impressions)} | ${fmtNum(w.conversions)} |`,
    );
  }
  lines.push("");

  lines.push("### Campaign breakdown (current week vs previous week)");
  lines.push("");
  lines.push(
    "| Campaign | Curr. spend | Prev. spend | Curr. clicks | Prev. clicks | Curr. conv. | Prev. conv. |",
  );
  lines.push("| --- | ---: | ---: | ---: | ---: | ---: | ---: |");

  const campaignIds = new Set<string>();
  for (const row of campaignRows) {
    campaignIds.add(row.campaign_id);
  }

  const breakdown = [...campaignIds].map((id) => {
    const cur = aggregateCampaignRows(
      campaignRows.filter((r) => r.campaign_id === id),
      weeks.weekStart,
      weeks.weekEnd,
    );
    const prev = aggregateCampaignRows(
      campaignRows.filter((r) => r.campaign_id === id),
      weeks.prevWeekStart,
      weeks.prevWeekEnd,
    );
    return { id, cur, prev };
  });
  breakdown.sort((a, b) => b.cur.spend - a.cur.spend);

  for (const { id, cur, prev } of breakdown) {
    const label = nameById.get(id) ?? id;
    lines.push(
      `| ${label} | ${fmtMoney(cur.spend)} | ${fmtMoney(prev.spend)} | ${fmtNum(cur.clicks)} | ${fmtNum(prev.clicks)} | ${fmtNum(cur.conversions)} | ${fmtNum(prev.conversions)} |`,
    );
  }
  lines.push("");

  const termTotals = new Map<
    string,
    { spend: number; clicks: number; impressions: number; conversions: number }
  >();
  for (const row of searchTermRows) {
    if (
      !dateInRange(row.report_date, weeks.trendStart, weeks.weekEnd)
    ) {
      continue;
    }
    const t = termTotals.get(row.search_term) ?? {
      spend: 0,
      clicks: 0,
      impressions: 0,
      conversions: 0,
    };
    t.spend += row.spend_cents / 100;
    t.clicks += row.clicks;
    t.impressions += row.impressions;
    t.conversions += row.conversions;
    termTotals.set(row.search_term, t);
  }

  const filteredTerms = [...termTotals.entries()].filter(
    ([, t]) => t.spend >= 15 || t.clicks >= 10,
  );
  filteredTerms.sort((a, b) => b[1].spend - a[1].spend);

  lines.push(
    "### Search terms (5-week cumulative; spend ≥ $15 or clicks ≥ 10)",
  );
  lines.push("");
  lines.push("| Search term | Spend | Clicks | Impressions | Conversions |");
  lines.push("| --- | ---: | ---: | ---: | ---: |");
  for (const [term, t] of filteredTerms) {
    lines.push(
      `| ${term.replace(/\|/g, "\\|")} | ${fmtMoney(t.spend)} | ${fmtNum(t.clicks)} | ${fmtNum(t.impressions)} | ${fmtNum(t.conversions)} |`,
    );
  }
  if (filteredTerms.length === 0) {
    lines.push("| _No terms met the threshold_ | | | | |");
  }
  lines.push("");

  return lines.join("\n");
}

export function buildAccountContextMarkdown(client: {
  name: string;
  google_ads_customer_id?: string | null;
  website_url?: string | null;
  industry?: string | null;
  marketing_brief?: string | null;
}): string {
  const lines: string[] = [
    "## Account context",
    "",
    `- **Client name:** ${client.name}`,
  ];
  if (client.google_ads_customer_id) {
    lines.push(
      `- **Google Ads customer ID:** ${client.google_ads_customer_id}`,
    );
  }
  if (client.website_url) {
    lines.push(`- **Website:** ${client.website_url}`);
  }
  if (client.industry) {
    lines.push(`- **Industry:** ${client.industry}`);
  }
  if (client.marketing_brief?.trim()) {
    lines.push("", "### Marketing brief", "", client.marketing_brief.trim());
  }
  return lines.join("\n");
}
