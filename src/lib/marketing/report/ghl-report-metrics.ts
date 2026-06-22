import type { createServiceClient } from "@/lib/supabase/service";
import type { DateWindow, KpiStat } from "@/lib/marketing/report/client-report-metrics";
import {
  BACK_CLINICS_CLIENT_ID,
  normalizeBackClinicsSource,
} from "@/lib/ghl/back-clinics-config";
import {
  bookedAppointmentTag,
  stageLabel,
  type GhlPipelineConfig,
} from "@/lib/marketing/report/ghl-pipeline-config";

type SB = ReturnType<typeof createServiceClient>;

export type GhlFourMetrics = {
  opportunitiesCreated: number;
  bookedAppointments: number;
  consultationAttended: number;
  patientsClosed: number;
  value: number;
};

export type GhlLeadSourceRow = {
  source: string;
  current: GhlFourMetrics;
  prior: GhlFourMetrics;
};

export type GhlYtdMonthRow = {
  monthLabel: string;
  monthKey: string;
  isFutureMonth: boolean;
  metrics: GhlFourMetrics;
};

export type BackClinicsSourceBreakdownRow = {
  source: string;
  leads: number;
  appointmentsBooked: number;
  consultations: number;
  customers: number;
  revenue: number;
};

export type BackClinicsDateRange = {
  start: Date;
  end: Date;
};

export type GhlReportData = {
  heroKpis: KpiStat[];
  leadSourceRows: GhlLeadSourceRow[];
  backClinicsSourceBreakdown?: BackClinicsSourceBreakdownRow[];
  ytdCurrentYear: GhlYtdMonthRow[];
  ytdPriorYear: GhlYtdMonthRow[];
  currentYear: number;
  priorYear: number;
  useBackClinicsCustomFields?: boolean;
};

type OppRow = {
  opportunity_id: string;
  stage_id: string | null;
  stage_name: string | null;
  status: string | null;
  monetary_value: number | null;
  contact_id: string | null;
  source: string | null;
  created_at_ghl: string | null;
  updated_at_ghl: string | null;
  appointment_booked_date?: string | null;
  customer_won_date?: string | null;
  consultation_attended_date?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
};

type OppSourceRow = {
  utm_source: string | null;
  utm_medium: string | null;
  appointment_booked_date: string | null;
  consultation_attended_date: string | null;
  customer_won_date: string | null;
  monetary_value: number | null;
  created_at_ghl: string | null;
};

type ContactRow = {
  contact_id: string;
  source: string | null;
  tags: string[] | null;
  date_added: string | null;
  appointment_booked_date?: string | null;
  customer_won_date?: string | null;
  consultation_attended_date?: string | null;
};

type TagEventRow = {
  contact_id: string;
  tag: string;
  detected_at: string;
};

const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function emptyMetrics(): GhlFourMetrics {
  return {
    opportunitiesCreated: 0,
    bookedAppointments: 0,
    consultationAttended: 0,
    patientsClosed: 0,
    value: 0,
  };
}

function isBackClinicsClientId(clientId: string): boolean {
  return clientId === BACK_CLINICS_CLIENT_ID;
}

function aggregateBackClinicsPeriod(
  opportunities: OppRow[],
  contacts: ContactRow[],
  start: Date,
  end: Date,
): GhlFourMetrics {
  const totals = emptyMetrics();

  for (const opp of opportunities) {
    if (inInclusiveRange(opp.created_at_ghl, start, end)) {
      totals.opportunitiesCreated += 1;
    }
    if (inInclusiveRange(opp.appointment_booked_date, start, end)) {
      totals.bookedAppointments += 1;
    }
    if (inInclusiveRange(opp.consultation_attended_date, start, end)) {
      totals.consultationAttended += 1;
    }
    if (inInclusiveRange(opp.customer_won_date, start, end)) {
      totals.patientsClosed += 1;
      totals.value += Number(opp.monetary_value ?? 0);
    }
  }

  for (const contact of contacts) {
    if (inInclusiveRange(contact.appointment_booked_date, start, end)) {
      totals.bookedAppointments += 1;
    }
    if (inInclusiveRange(contact.consultation_attended_date, start, end)) {
      totals.consultationAttended += 1;
    }
    if (inInclusiveRange(contact.customer_won_date, start, end)) {
      totals.patientsClosed += 1;
    }
  }

  return totals;
}

function emptyBackClinicsSourceBreakdownRow(
  source: string,
): BackClinicsSourceBreakdownRow {
  return {
    source,
    leads: 0,
    appointmentsBooked: 0,
    consultations: 0,
    customers: 0,
    revenue: 0,
  };
}

function aggregateBackClinicsSourceBreakdown(
  rows: OppSourceRow[],
  start: Date,
  end: Date,
): BackClinicsSourceBreakdownRow[] {
  const rawBuckets = new Map<
    string,
    {
      utmSource: string | null;
      utmMedium: string | null;
      leads: number;
      appointmentsBooked: number;
      consultations: number;
      customers: number;
      revenue: number;
    }
  >();

  for (const opp of rows) {
    if (!inInclusiveRange(opp.created_at_ghl, start, end)) continue;

    const utmSource = opp.utm_source;
    const utmMedium = opp.utm_medium;
    const rawKey = `${utmSource ?? ""}\0${utmMedium ?? ""}`;

    let bucket = rawBuckets.get(rawKey);
    if (!bucket) {
      bucket = {
        utmSource,
        utmMedium,
        leads: 0,
        appointmentsBooked: 0,
        consultations: 0,
        customers: 0,
        revenue: 0,
      };
      rawBuckets.set(rawKey, bucket);
    }

    bucket.leads += 1;
    if (inInclusiveRange(opp.appointment_booked_date, start, end)) {
      bucket.appointmentsBooked += 1;
    }
    if (inInclusiveRange(opp.consultation_attended_date, start, end)) {
      bucket.consultations += 1;
    }
    if (inInclusiveRange(opp.customer_won_date, start, end)) {
      bucket.customers += 1;
      bucket.revenue += Number(opp.monetary_value ?? 0);
    }
  }

  const normalized = new Map<string, BackClinicsSourceBreakdownRow>();
  for (const bucket of Array.from(rawBuckets.values())) {
    const source = normalizeBackClinicsSource(bucket.utmSource, bucket.utmMedium);
    const row =
      normalized.get(source) ?? emptyBackClinicsSourceBreakdownRow(source);
    row.leads += bucket.leads;
    row.appointmentsBooked += bucket.appointmentsBooked;
    row.consultations += bucket.consultations;
    row.customers += bucket.customers;
    row.revenue += bucket.revenue;
    normalized.set(source, row);
  }

  return Array.from(normalized.values()).sort((a, b) => b.leads - a.leads);
}

export async function getBackClinicsSourceBreakdown(
  supabase: SB,
  clientId: string,
  dateRange: BackClinicsDateRange,
): Promise<BackClinicsSourceBreakdownRow[]> {
  if (!isBackClinicsClientId(clientId)) return [];

  const { data, error } = await supabase
    .from("ghl_opportunities")
    .select(
      "utm_source, utm_medium, appointment_booked_date, consultation_attended_date, customer_won_date, monetary_value, created_at_ghl",
    )
    .eq("client_id", clientId)
    .gte("created_at_ghl", dateRange.start.toISOString())
    .lte("created_at_ghl", dateRange.end.toISOString());

  if (error) throw error;

  return aggregateBackClinicsSourceBreakdown(
    (data ?? []) as unknown as OppSourceRow[],
    dateRange.start,
    dateRange.end,
  );
}

function buildBackClinicsHeroKpis(
  current: GhlFourMetrics,
  prior: GhlFourMetrics,
): KpiStat[] {
  return [
    {
      label: "Leads",
      current: current.opportunitiesCreated,
      prior: prior.opportunitiesCreated,
      format: "number",
    },
    {
      label: "Appointments Booked",
      current: current.bookedAppointments,
      prior: prior.bookedAppointments,
      format: "number",
    },
    {
      label: "Consultation Attended",
      current: current.consultationAttended,
      prior: prior.consultationAttended,
      format: "number",
    },
    {
      label: "Customers",
      current: current.patientsClosed,
      prior: prior.patientsClosed,
      format: "number",
    },
    {
      label: "Revenue",
      current: current.value,
      prior: prior.value,
      format: "currency",
    },
  ];
}

function buildBackClinicsYtdRows(
  year: number,
  opportunities: OppRow[],
  contacts: ContactRow[],
  now: Date,
): GhlYtdMonthRow[] {
  const rows: GhlYtdMonthRow[] = [];
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();

  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    const isFutureMonth = year > currentYear || (year === currentYear && monthIndex > currentMonth);
    const start = monthStartUtc(year, monthIndex);
    const end = monthEndUtc(year, monthIndex);
    const metrics = isFutureMonth
      ? emptyMetrics()
      : aggregateBackClinicsPeriod(opportunities, contacts, start, end);

    rows.push({
      monthLabel: MONTH_LABELS[monthIndex],
      monthKey: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
      isFutureMonth,
      metrics,
    });
  }
  return rows;
}

function monthStartUtc(year: number, monthIndex: number): Date {
  return new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
}

function monthEndUtc(year: number, monthIndex: number): Date {
  return new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));
}

function inInclusiveRange(iso: string | null | undefined, start: Date, end: Date): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t <= end.getTime();
}

function resolveContactSource(c: ContactRow): string {
  const trimmed = (c.source ?? "").trim();
  return trimmed.length > 0 ? trimmed : "Unknown";
}

function contactHasTag(
  tags: string[] | null | undefined,
  tagName: string,
): boolean {
  const needle = tagName.trim().toLowerCase();
  if (!needle) return false;
  if (!tags?.length) return false;
  return tags.some((t) => t.trim().toLowerCase() === needle);
}

function aggregateContactsByTag(
  contacts: ContactRow[],
  tagName: string,
  start: Date,
  end: Date,
): { total: number; bySource: Map<string, number> } {
  const bySource = new Map<string, number>();
  let total = 0;
  for (const c of contacts) {
    if (!inInclusiveRange(c.date_added, start, end)) continue;
    if (!contactHasTag(c.tags, tagName)) continue;
    total += 1;
    const source = resolveContactSource(c);
    bySource.set(source, (bySource.get(source) ?? 0) + 1);
  }
  return { total, bySource };
}

const GOOGLE_ADS_CONTACT_TAG = "google ads";
const LEAD_SOURCE_GOOGLE_ADS = "Google Ads";
const LEAD_SOURCE_OTHER = "Other Lead Sources";

function emptyLeadSourceBuckets(): Map<string, GhlFourMetrics> {
  return new Map([
    [LEAD_SOURCE_GOOGLE_ADS, emptyMetrics()],
    [LEAD_SOURCE_OTHER, emptyMetrics()],
  ]);
}

function contactByIdMap(contacts: ContactRow[]): Map<string, ContactRow> {
  const map = new Map<string, ContactRow>();
  for (const c of contacts) {
    map.set(c.contact_id, c);
  }
  return map;
}

function isGoogleAdsContact(contact: ContactRow | null | undefined): boolean {
  return contactHasTag(contact?.tags ?? null, GOOGLE_ADS_CONTACT_TAG);
}

function mcdLeadSourceBucketForOpportunity(
  opp: OppRow,
  contactById: Map<string, ContactRow>,
): string {
  const contact = opp.contact_id ? contactById.get(opp.contact_id) : undefined;
  return isGoogleAdsContact(contact) ? LEAD_SOURCE_GOOGLE_ADS : LEAD_SOURCE_OTHER;
}

function isBookedAppointmentTagEvent(
  row: TagEventRow,
  bookedTag: string,
): boolean {
  return normalizeMetricToken(row.tag) === normalizeMetricToken(bookedTag);
}

function countBookedFromTagEvents(
  tagEvents: TagEventRow[],
  bookedTag: string,
  start: Date,
  end: Date,
): number {
  let total = 0;
  for (const row of tagEvents) {
    if (!isBookedAppointmentTagEvent(row, bookedTag)) continue;
    if (!inInclusiveRange(row.detected_at, start, end)) continue;
    total += 1;
  }
  return total;
}

function aggregateBookedLeadSourceFromTagEvents(
  tagEvents: TagEventRow[],
  contactById: Map<string, ContactRow>,
  bookedTag: string,
  start: Date,
  end: Date,
): Map<string, number> {
  const bySource = new Map<string, number>([
    [LEAD_SOURCE_GOOGLE_ADS, 0],
    [LEAD_SOURCE_OTHER, 0],
  ]);

  for (const row of tagEvents) {
    if (!isBookedAppointmentTagEvent(row, bookedTag)) continue;
    if (!inInclusiveRange(row.detected_at, start, end)) continue;
    const contact = contactById.get(row.contact_id);
    const bucketKey = isGoogleAdsContact(contact)
      ? LEAD_SOURCE_GOOGLE_ADS
      : LEAD_SOURCE_OTHER;
    bySource.set(bucketKey, (bySource.get(bucketKey) ?? 0) + 1);
  }

  return bySource;
}

function addNonLeadOpportunityMetrics(
  target: GhlFourMetrics,
  add: GhlFourMetrics,
) {
  target.patientsClosed += add.patientsClosed;
  target.value += add.value;
}

function aggregateMcdLeadSourcePeriod(
  opportunities: OppRow[],
  contacts: ContactRow[],
  tagEvents: TagEventRow[],
  contactById: Map<string, ContactRow>,
  config: GhlPipelineConfig,
  start: Date,
  end: Date,
): Map<string, GhlFourMetrics> {
  const buckets = emptyLeadSourceBuckets();
  const bookedTag = bookedAppointmentTag(config);

  for (const opp of opportunities) {
    if (!inInclusiveRange(opp.created_at_ghl, start, end)) continue;
    const bucketKey = mcdLeadSourceBucketForOpportunity(opp, contactById);
    buckets.get(bucketKey)!.opportunitiesCreated += 1;
  }

  for (const opp of opportunities) {
    const slice = metricsForOpportunityInPeriod(opp, config, start, end);
    if (slice.patientsClosed + slice.value === 0) continue;
    const bucketKey = mcdLeadSourceBucketForOpportunity(opp, contactById);
    addNonLeadOpportunityMetrics(buckets.get(bucketKey)!, slice);
  }

  const bookedBySource = aggregateBookedLeadSourceFromTagEvents(
    tagEvents,
    contactById,
    bookedTag,
    start,
    end,
  );
  for (const [source, count] of Array.from(bookedBySource.entries())) {
    buckets.get(source)!.bookedAppointments = count;
  }

  if (config.closed_tag) {
    for (const contact of contacts) {
      if (!inInclusiveRange(contact.date_added, start, end)) continue;
      if (!contactHasTag(contact.tags, config.closed_tag)) continue;
      const bucketKey = isGoogleAdsContact(contact)
        ? LEAD_SOURCE_GOOGLE_ADS
        : LEAD_SOURCE_OTHER;
      buckets.get(bucketKey)!.patientsClosed += 1;
    }
  }

  return buckets;
}

function buildMcdLeadSourceRows(
  current: Map<string, GhlFourMetrics>,
  prior: Map<string, GhlFourMetrics>,
): GhlLeadSourceRow[] {
  return [LEAD_SOURCE_GOOGLE_ADS, LEAD_SOURCE_OTHER].map((source) => ({
    source,
    current: current.get(source) ?? emptyMetrics(),
    prior: prior.get(source) ?? emptyMetrics(),
  }));
}

function normalizeMetricToken(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function closedStageNameFromConfig(config: GhlPipelineConfig): string | null {
  const closedStageId = config.stages?.closed;
  if (!closedStageId) return null;
  const label = stageLabel(config, closedStageId);
  return label === "Unknown" ? null : label;
}

/** Won deals or opportunities in the configured closed stage (by stage name or id). */
function countsTowardSalesValue(opp: OppRow, config: GhlPipelineConfig): boolean {
  if (normalizeMetricToken(opp.status) === "won") return true;

  const closedStageName = closedStageNameFromConfig(config);
  if (
    closedStageName &&
    normalizeMetricToken(opp.stage_name) === normalizeMetricToken(closedStageName)
  ) {
    return true;
  }

  const closedStageId = config.stages?.closed;
  return Boolean(closedStageId && opp.stage_id === closedStageId);
}

function metricsForOpportunityInPeriod(
  opp: OppRow,
  config: GhlPipelineConfig,
  start: Date,
  end: Date,
): GhlFourMetrics {
  const m = emptyMetrics();
  const createdInPeriod = inInclusiveRange(opp.created_at_ghl, start, end);

  if (createdInPeriod) {
    m.opportunitiesCreated = 1;
  }

  if (
    !config.closed_tag &&
    config.stages?.closed &&
    opp.stage_id === config.stages.closed &&
    inInclusiveRange(opp.updated_at_ghl ?? opp.created_at_ghl, start, end)
  ) {
    m.patientsClosed = 1;
  }
  if (createdInPeriod && countsTowardSalesValue(opp, config)) {
    m.value = Number(opp.monetary_value ?? 0);
  }
  return m;
}

function addMetrics(target: GhlFourMetrics, add: GhlFourMetrics) {
  target.opportunitiesCreated += add.opportunitiesCreated;
  target.bookedAppointments += add.bookedAppointments;
  target.consultationAttended += add.consultationAttended;
  target.patientsClosed += add.patientsClosed;
  target.value += add.value;
}

function aggregatePeriod(
  opportunities: OppRow[],
  contacts: ContactRow[],
  tagEvents: TagEventRow[],
  config: GhlPipelineConfig,
  start: Date,
  end: Date,
): { totals: GhlFourMetrics } {
  const totals = emptyMetrics();
  const bookedTag = bookedAppointmentTag(config);

  for (const opp of opportunities) {
    const slice = metricsForOpportunityInPeriod(opp, config, start, end);
    if (
      slice.opportunitiesCreated + slice.patientsClosed + slice.value ===
      0
    ) {
      continue;
    }
    addMetrics(totals, slice);
  }

  totals.bookedAppointments = countBookedFromTagEvents(
    tagEvents,
    bookedTag,
    start,
    end,
  );

  if (config.closed_tag) {
    const closed = aggregateContactsByTag(contacts, config.closed_tag, start, end);
    totals.patientsClosed = closed.total;
  }

  return { totals };
}

function buildHeroKpis(current: GhlFourMetrics, prior: GhlFourMetrics): KpiStat[] {
  return [
    {
      label: "Leads",
      current: current.opportunitiesCreated,
      prior: prior.opportunitiesCreated,
      format: "number",
    },
    {
      label: "Appointments Booked",
      current: current.bookedAppointments,
      prior: prior.bookedAppointments,
      format: "number",
    },
    {
      label: "Customers",
      current: current.patientsClosed,
      prior: prior.patientsClosed,
      format: "number",
    },
    {
      label: "Sales Value",
      current: current.value,
      prior: prior.value,
      format: "currency",
    },
  ];
}

function buildYtdRows(
  year: number,
  opportunities: OppRow[],
  contacts: ContactRow[],
  tagEvents: TagEventRow[],
  config: GhlPipelineConfig,
  now: Date,
): GhlYtdMonthRow[] {
  const rows: GhlYtdMonthRow[] = [];
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();

  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    const isFutureMonth = year > currentYear || (year === currentYear && monthIndex > currentMonth);
    const start = monthStartUtc(year, monthIndex);
    const end = monthEndUtc(year, monthIndex);
    const { totals } = isFutureMonth
      ? { totals: emptyMetrics() }
      : aggregatePeriod(opportunities, contacts, tagEvents, config, start, end);

    rows.push({
      monthLabel: MONTH_LABELS[monthIndex],
      monthKey: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
      isFutureMonth,
      metrics: totals,
    });
  }
  return rows;
}

export async function fetchGhlHeroMetrics(
  supabase: SB,
  clientId: string,
  config: GhlPipelineConfig,
  referenceDate = new Date(),
): Promise<{ current: GhlFourMetrics; prior: GhlFourMetrics }> {
  const currentYear = referenceDate.getUTCFullYear();
  const currentMonthStart = monthStartUtc(
    currentYear,
    referenceDate.getUTCMonth(),
  );
  const currentMonthEnd = new Date(
    Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth(),
      referenceDate.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );

  const priorMonthIndex =
    referenceDate.getUTCMonth() === 0 ? 11 : referenceDate.getUTCMonth() - 1;
  const priorMonthYear =
    referenceDate.getUTCMonth() === 0 ? currentYear - 1 : currentYear;
  const priorMonthStart = monthStartUtc(priorMonthYear, priorMonthIndex);
  const priorMonthEnd = monthEndUtc(priorMonthYear, priorMonthIndex);

  const fetchStart = `${currentYear - 1}-01-01T00:00:00.000Z`;
  const { opportunities, contacts, tagEvents } = await fetchGhlReportEntities(
    supabase,
    clientId,
    fetchStart,
  );

  const current = aggregatePeriod(
    opportunities,
    contacts,
    tagEvents,
    config,
    currentMonthStart,
    currentMonthEnd,
  ).totals;
  const prior = aggregatePeriod(
    opportunities,
    contacts,
    tagEvents,
    config,
    priorMonthStart,
    priorMonthEnd,
  ).totals;

  return { current, prior };
}

async function fetchGhlReportEntities(
  supabase: SB,
  clientId: string,
  fetchStart: string,
) {
  const [oppRes, contactRes, tagEventsRes] = await Promise.all([
    supabase
      .from("ghl_opportunities")
      .select(
        "opportunity_id, stage_id, stage_name, status, monetary_value, contact_id, source, created_at_ghl, updated_at_ghl, appointment_booked_date, customer_won_date, consultation_attended_date",
      )
      .eq("client_id", clientId)
      .or(
        `created_at_ghl.gte.${fetchStart},updated_at_ghl.gte.${fetchStart},appointment_booked_date.gte.${fetchStart},customer_won_date.gte.${fetchStart},consultation_attended_date.gte.${fetchStart}`,
      ),
    supabase
      .from("ghl_contacts")
      .select(
        "contact_id, source, tags, date_added, appointment_booked_date, customer_won_date, consultation_attended_date",
      )
      .eq("client_id", clientId),
    supabase
      .from("ghl_contact_tag_events")
      .select("contact_id, tag, detected_at")
      .eq("client_id", clientId)
      .gte("detected_at", fetchStart),
  ]);

  if (oppRes.error) throw oppRes.error;
  if (contactRes.error) throw contactRes.error;
  if (tagEventsRes.error) throw tagEventsRes.error;

  return {
    opportunities: (oppRes.data ?? []) as unknown as OppRow[],
    contacts: (contactRes.data ?? []) as unknown as ContactRow[],
    tagEvents: (tagEventsRes.data ?? []) as unknown as TagEventRow[],
  };
}

export async function fetchGhlReportData(
  supabase: SB,
  clientId: string,
  config: GhlPipelineConfig,
  opts?: { referenceDate?: Date; windows?: DateWindow },
): Promise<GhlReportData> {
  const referenceDate = opts?.referenceDate ?? new Date();
  const useBackClinics = isBackClinicsClientId(clientId);
  const currentYear = referenceDate.getUTCFullYear();
  const priorYear = currentYear - 1;

  const currentPeriodStart = opts?.windows
    ? new Date(`${opts.windows.currentStart}T00:00:00.000Z`)
    : monthStartUtc(currentYear, referenceDate.getUTCMonth());
  const currentPeriodEnd = opts?.windows
    ? new Date(`${opts.windows.currentEnd}T23:59:59.999Z`)
    : new Date(
        Date.UTC(
          referenceDate.getUTCFullYear(),
          referenceDate.getUTCMonth(),
          referenceDate.getUTCDate(),
          23,
          59,
          59,
          999,
        ),
      );

  const priorPeriodStart = opts?.windows
    ? new Date(`${opts.windows.priorStart}T00:00:00.000Z`)
    : monthStartUtc(
        referenceDate.getUTCMonth() === 0 ? currentYear - 1 : currentYear,
        referenceDate.getUTCMonth() === 0 ? 11 : referenceDate.getUTCMonth() - 1,
      );
  const priorPeriodEnd = opts?.windows
    ? new Date(`${opts.windows.priorEnd}T23:59:59.999Z`)
    : monthEndUtc(
        referenceDate.getUTCMonth() === 0 ? currentYear - 1 : currentYear,
        referenceDate.getUTCMonth() === 0 ? 11 : referenceDate.getUTCMonth() - 1,
      );

  const fetchStart = opts?.windows
    ? `${opts.windows.priorStart}T00:00:00.000Z`
    : `${priorYear}-01-01T00:00:00.000Z`;

  const { opportunities, contacts, tagEvents } = await fetchGhlReportEntities(
    supabase,
    clientId,
    fetchStart,
  );

  if (useBackClinics) {
    const currentTotals = aggregateBackClinicsPeriod(
      opportunities,
      contacts,
      currentPeriodStart,
      currentPeriodEnd,
    );
    const priorTotals = aggregateBackClinicsPeriod(
      opportunities,
      contacts,
      priorPeriodStart,
      priorPeriodEnd,
    );
    const backClinicsSourceBreakdown = await getBackClinicsSourceBreakdown(
      supabase,
      clientId,
      { start: currentPeriodStart, end: currentPeriodEnd },
    );

    return {
      heroKpis: buildBackClinicsHeroKpis(currentTotals, priorTotals),
      leadSourceRows: [],
      backClinicsSourceBreakdown,
      ytdCurrentYear: buildBackClinicsYtdRows(
        currentYear,
        opportunities,
        contacts,
        referenceDate,
      ),
      ytdPriorYear: buildBackClinicsYtdRows(
        priorYear,
        opportunities,
        contacts,
        referenceDate,
      ),
      currentYear,
      priorYear,
      useBackClinicsCustomFields: true,
    };
  }

  const contactById = contactByIdMap(contacts);

  const currentAgg = aggregatePeriod(
    opportunities,
    contacts,
    tagEvents,
    config,
    currentPeriodStart,
    currentPeriodEnd,
  );
  const priorAgg = aggregatePeriod(
    opportunities,
    contacts,
    tagEvents,
    config,
    priorPeriodStart,
    priorPeriodEnd,
  );

  const currentLeadSource = aggregateMcdLeadSourcePeriod(
    opportunities,
    contacts,
    tagEvents,
    contactById,
    config,
    currentPeriodStart,
    currentPeriodEnd,
  );
  const priorLeadSource = aggregateMcdLeadSourcePeriod(
    opportunities,
    contacts,
    tagEvents,
    contactById,
    config,
    priorPeriodStart,
    priorPeriodEnd,
  );
  const leadSourceRows = buildMcdLeadSourceRows(currentLeadSource, priorLeadSource);

  return {
    heroKpis: buildHeroKpis(currentAgg.totals, priorAgg.totals),
    leadSourceRows,
    ytdCurrentYear: buildYtdRows(
      currentYear,
      opportunities,
      contacts,
      tagEvents,
      config,
      referenceDate,
    ),
    ytdPriorYear: buildYtdRows(
      priorYear,
      opportunities,
      contacts,
      tagEvents,
      config,
      referenceDate,
    ),
    currentYear,
    priorYear,
    useBackClinicsCustomFields: false,
  };
}

export function formatGhlMetricValue(
  key: keyof GhlFourMetrics,
  value: number,
): string {
  if (key === "value") {
    return value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return Math.round(value).toLocaleString("en-US");
}

export function ghlMetricColumns(
  useBackClinicsCustomFields?: boolean,
): { key: keyof GhlFourMetrics; label: string }[] {
  if (useBackClinicsCustomFields) {
    return [
      { key: "opportunitiesCreated", label: "Leads" },
      { key: "bookedAppointments", label: "Appt. Booked" },
      { key: "consultationAttended", label: "Consult Attended" },
      { key: "patientsClosed", label: "Customers" },
      { key: "value", label: "Revenue" },
    ];
  }
  return [
    { key: "opportunitiesCreated", label: "Leads" },
    { key: "bookedAppointments", label: "Appt. Booked" },
    { key: "patientsClosed", label: "Customers" },
    { key: "value", label: "Sales Val." },
  ];
}
