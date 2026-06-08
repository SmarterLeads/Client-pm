import { notFound } from "next/navigation";

import { CampaignPerformanceTable } from "@/components/marketing/report/campaign-performance-table";
import { GoogleAdsCampaignPerformanceTable } from "@/components/marketing/report/google-ads-campaign-performance-table";
import { ConversionBreakdownCards } from "@/components/marketing/report/conversion-breakdown-cards";
import {
  reportCardItemShellClass,
  reportCardRowLayoutClass,
} from "@/components/marketing/report/report-centered-row";
import {
  PerformanceLineChart,
  type ReportSeriesPoint,
} from "@/components/marketing/report/performance-line-chart";
import { ReportTabNav } from "@/components/marketing/report/report-tab-nav";
import { DateRangeDropdown } from "@/components/marketing/report/date-range-dropdown";
import { DownloadPdfButton } from "@/components/marketing/report/download-pdf-button";
import { AgencyLogo } from "@/components/marketing/report/agency-logo";
import { ReportSidebar, type SidebarGroup } from "@/components/marketing/report/report-sidebar";
import { LocationBreakdownSection } from "@/components/marketing/report/location-breakdown-section";
import { MetaLocationBreakdownSection } from "@/components/marketing/report/meta-location-breakdown-section";
import { YtdYearComparison } from "@/components/marketing/report/ytd-year-comparison";
import { YtdMonthlyTable } from "@/components/marketing/report/ytd-monthly-table";
import { normalizeAgencyLogoUrl } from "@/lib/report/normalize-agency-logo-url";
import { createServiceClient } from "@/lib/supabase/service";
import { fetchPmReportSidebarGroups } from "@/lib/marketing/client-report-sidebar";
import {
  type ChannelSummary,
  type DateWindow,
  type KpiStat,
  buildChartData,
  buildChannelSummary,
  fetchConfiguredConversionTotals,
  fetchPurchaseConversionTotals,
  fetchLittleCanadianHeroPurchaseTotals,
  isLittleCanadianClient,
  backClinicsUsesSlimYtdColumns,
  type LittleCanadianHeroPurchaseScope,
  fetchConversionBreakdownCards,
  fetchDailyPerformance,
  fetchClientMetricConfigRows,
  fetchMetaCampaignRollupsForWindow,
  buildPlatformHeroKpis,
  searchLostForPlatformRows,
  buildReportHeroKpis,
  flattenReportHeroKpis,
  type ReportHeroKpisSplit,
} from "@/lib/report/client-report-metrics";
import {
  buildGoogleCampaignColumnVisibility,
  buildMetaCampaignColumnVisibility,
  buildMicrosoftCampaignColumnVisibility,
  buildYtdColumnVisibility,
  filterLegacyMetricRows,
  hasChannelMetricKeys,
  isChannelPlatformSlug,
  mergeChannelMetricRows,
} from "@/lib/report/channel-metric-config";
import {
  aggregateDailyPerf,
  emptyGoogleQualityRollup,
  emptyMetaRollup,
  normalizeClientType,
  resolveMetricVisibility,
} from "@/lib/report/client-metric-config";
import {
  fetchGoogleLocationBreakdown,
  GOOGLE_SHOW_LOCATION_BREAKDOWN_KEY,
} from "@/lib/report/google-location-breakdown";
import type { LocationBreakdownState } from "@/lib/report/hudson-location-breakdown";
import {
  fetchMetaLocationBreakdown,
  META_SHOW_LOCATION_BREAKDOWN_KEY,
  type MetaLocationBreakdownState,
} from "@/lib/report/meta-location-breakdown";
import {
  fetchMetaCampaignRowsForReport,
} from "@/lib/report/meta-campaign-report";
import {
  buildChartDataForRows,
  canonicalReportPlatformSlug,
  fetchCampaignPerformanceRows,
  fetchConversionTotalsByDisplayPlatform,
  fetchReportTabPlatforms,
  loadActiveConversionPairIndex,
  normalizeReportView,
  filterDailyPerfRowsByTabSlugs,
  platformSlugMatchesRow,
  sumActiveConversionsForPlatform,
  buildYtdMonthlyTableRows,
  ytdMonthRowsHaveMetrics,
  fetchMetaEcommercePurchasesByMonth,
  fetchGoogleEcommercePurchasesByMonth,
  fetchHudsonOverviewPurchasesByMonth,
} from "@/lib/report/report-tab-platform";
import { GhlReportTab } from "@/components/marketing/report/ghl-report-tab";
import { WhatConvertsReportTab } from "@/components/marketing/report/whatconverts-report-tab";
import { parseGhlPipelineConfig } from "@/lib/report/ghl-pipeline-config";
import { parseWhatConvertsConfig } from "@/lib/report/whatconverts-config";
import { fetchGhlReportData } from "@/lib/report/ghl-report-metrics";
import { fetchWhatConvertsReportData } from "@/lib/report/whatconverts-report-metrics";
import {
  fetchAdsCampaignTableState,
  type GoogleAdsCampaignTableState,
} from "@/lib/report/google-ads-campaign-report";

type DateRangePreset = "last_7" | "last_30" | "mtd" | "last_month";

type ReportClient = {
  id: string;
  slug: string;
  agencyId: string;
  clientName: string;
  clientType: string;
  showPriorYearYtd: boolean;
  showEcommerceHeroRow: boolean;
  defaultChartMode: "conversions" | "traffic";
  agencyName: string;
  agencyLogoUrl: string | null;
  agencyPrimaryColor: string;
  agencySecondaryColor: string | null;
  contactEmail: string;
  ghlPipelineConfig: ReturnType<typeof parseGhlPipelineConfig>;
  whatconvertsProfileId: string | null;
  whatconvertsConfig: ReturnType<typeof parseWhatConvertsConfig>;
};

/** Campaign Performance, Conversion Breakdown headings. */
const REPORT_FOCUS_SECTION_TITLE = "text-center text-base font-bold text-zinc-900";

export type ClientMarketingReportSearchParams = {
  range?: string;
  start?: string;
  end?: string;
  view?: string;
};

type ClientMarketingReportViewProps = {
  slug: string;
  searchParams?: ClientMarketingReportSearchParams;
  /** When true, omits sidebar and full-bleed layout (for client detail embed). */
  embedded?: boolean;
  navBasePath?: string;
  navPreservedQuery?: Record<string, string>;
};

export async function ClientMarketingReportView({
  slug,
  searchParams: sp,
  embedded = false,
  navBasePath,
  navPreservedQuery,
}: ClientMarketingReportViewProps) {
  const rangeSelection = normalizeRangeSelection(sp?.range, sp?.start, sp?.end);
  const windows = getWindows(rangeSelection);
  const rangeParam = rangeSelection.kind;
  const rangeStartParam = rangeSelection.kind === "custom" ? rangeSelection.start : undefined;
  const rangeEndParam = rangeSelection.kind === "custom" ? rangeSelection.end : undefined;
  const calendarYear = Number(new Date().toISOString().slice(0, 4));
  const supabase = createServiceClient();

  const report = await fetchClientReportMeta(supabase, slug);
  if (!report) notFound();

  const sidebarGroupsPromise = embedded
    ? Promise.resolve([])
    : fetchPmReportSidebarGroups(supabase, report.agencyId);

  const tabPlatforms = await fetchReportTabPlatforms(supabase, report.id);
  const tabSlugSet = new Set(tabPlatforms.map((t) => t.slug));

  const metricRows = await fetchClientMetricConfigRows(supabase, report.id);
  const channelMerged = mergeChannelMetricRows(metricRows, report.defaultChartMode);
  const baseShowOverviewTab = tabPlatforms.length !== 1;
  const hideOverviewByConfig =
    hasChannelMetricKeys(metricRows) &&
    tabPlatforms.length >= 2 &&
    channelMerged.booleans.global_show_overview_tab === false;
  const showOverviewTab = baseShowOverviewTab && !hideOverviewByConfig;
  const solePlatformSlug = tabPlatforms.length === 1 ? tabPlatforms[0].slug : null;

  const viewRaw = normalizeReportView(sp?.view);
  let activeView =
    solePlatformSlug !== null
      ? viewRaw === "overview" || !tabSlugSet.has(viewRaw)
        ? solePlatformSlug
        : viewRaw
      : viewRaw !== "overview" && !tabSlugSet.has(viewRaw)
        ? "overview"
        : viewRaw;

  if (
    hideOverviewByConfig &&
    activeView === "overview" &&
    tabPlatforms.length > 0
  ) {
    activeView = tabPlatforms[0].slug;
  }

  const activeConvPairs = await loadActiveConversionPairIndex(supabase, report.id);

  const isGhlView = activeView === "ghl";
  const isWhatConvertsView = activeView === "whatconverts";

  const isEcommerceClient = normalizeClientType(report.clientType) === "ecommerce";
  const showEcommerceHeroRow = report.showEcommerceHeroRow;
  const showPriorYearYtd = report.showPriorYearYtd;
  const useBackClinicsSlimYtdColumns = backClinicsUsesSlimYtdColumns(
    report.id,
    slug,
    activeView,
  );
  const useMetaEcommerceColumns =
    isEcommerceClient && canonicalReportPlatformSlug(activeView) === "meta";
  const useGoogleEcommerceColumns =
    isEcommerceClient && canonicalReportPlatformSlug(activeView) === "google";
  const useCampaignEcommerceColumns =
    useMetaEcommerceColumns || useGoogleEcommerceColumns;
  const useHudsonOverviewYtdColumns =
    isEcommerceClient && showPriorYearYtd && activeView === "overview";
  /** Little Canadian Google YTD: Month, Spend, Conversions, Purchases, Purchase Value (matches Overview/Meta). */
  const useLittleCanadianSlimGoogleYtdColumns =
    showEcommerceHeroRow && useGoogleEcommerceColumns;
  const ytdUseHudsonOverviewColumns =
    useHudsonOverviewYtdColumns || useLittleCanadianSlimGoogleYtdColumns;
  const ytdUseEcommerceColumns =
    useCampaignEcommerceColumns && !useLittleCanadianSlimGoogleYtdColumns;
  const hudsonYtdConversionSlugs = ["google", "tiktok"] as const;
  const hideTikTokYtdColumns = canonicalReportPlatformSlug(activeView) === "tiktok";
  const priorCalendarYear = calendarYear - 1;

  const [perfRows, ytdPerfAll, ytdPerfPriorYear] = await Promise.all([
    fetchDailyPerformance(supabase, report.id, windows.priorStart, windows.currentEnd),
    fetchDailyPerformance(
      supabase,
      report.id,
      `${calendarYear}-01-01`,
      `${calendarYear}-12-31`,
    ),
    showPriorYearYtd
      ? fetchDailyPerformance(
          supabase,
          report.id,
          `${priorCalendarYear}-01-01`,
          `${priorCalendarYear}-12-31`,
        )
      : Promise.resolve([]),
  ]);
  const currentPerf = perfRows.filter((r) => r.report_date >= windows.currentStart);
  const priorPerf = perfRows.filter((r) => r.report_date < windows.currentStart);

  const [metaRollupCurrent, metaRollupPrior] = await Promise.all([
    fetchMetaCampaignRollupsForWindow(
      supabase,
      report.id,
      windows.currentStart,
      windows.currentEnd,
    ),
    fetchMetaCampaignRollupsForWindow(supabase, report.id, windows.priorStart, windows.priorEnd),
  ]);
  const legacyRows = filterLegacyMetricRows(metricRows);
  const metricVisibility = resolveMetricVisibility(
    normalizeClientType(report.clientType),
    legacyRows,
  );
  const googleSearchLostCurrent = searchLostForPlatformRows(
    currentPerf,
    "google",
    windows.currentStart,
    windows.currentEnd,
  );
  const googleSearchLostPrior = searchLostForPlatformRows(
    priorPerf,
    "google",
    windows.priorStart,
    windows.priorEnd,
  );
  const googleQualityRollup = {
    ...emptyGoogleQualityRollup(),
    searchLostIsRankAvg: googleSearchLostCurrent.searchLostRankAvg,
    searchLostIsBudgetAvg: googleSearchLostCurrent.searchLostBudgetAvg,
  };
  const googleQualityPriorRollup = {
    ...emptyGoogleQualityRollup(),
    searchLostIsRankAvg: googleSearchLostPrior.searchLostRankAvg,
    searchLostIsBudgetAvg: googleSearchLostPrior.searchLostBudgetAvg,
  };
  const reportChartMode = hasChannelMetricKeys(metricRows)
    ? channelMerged.chartMode
    : report.defaultChartMode;
  const showHeroChartSection =
    !hasChannelMetricKeys(metricRows) ||
    channelMerged.booleans.global_show_hero_chart !== false;
  const showConversionBreakdownSection =
    channelMerged.booleans.global_show_conversion_breakdown !== false;
  const chb = channelMerged.booleans;
  const breakdownFetchOpts = { breakdownBooleans: chb };

  const heroPurchaseScopeForView = (viewSlug: string): LittleCanadianHeroPurchaseScope => {
    if (viewSlug === "meta") return "meta";
    if (viewSlug === "google") return "google";
    return "overview";
  };

  const fetchHeroPurchaseTotals = (viewSlug: string) => {
    if (!showEcommerceHeroRow) {
      return Promise.resolve({
        current: 0,
        prior: 0,
        currentValue: 0,
        priorValue: 0,
        hasPurchaseConversions: false,
      });
    }
    if (isLittleCanadianClient(report.id, slug)) {
      return fetchLittleCanadianHeroPurchaseTotals(
        supabase,
        report.id,
        windows,
        heroPurchaseScopeForView(viewSlug),
      );
    }
    if (!isEcommerceClient) {
      return Promise.resolve({
        current: 0,
        prior: 0,
        currentValue: 0,
        priorValue: 0,
        hasPurchaseConversions: false,
      });
    }
    const platformSlug =
      viewSlug === "overview" ? null : viewSlug;
    return fetchPurchaseConversionTotals(
      supabase,
      report.id,
      windows,
      activeConvPairs,
      platformSlug,
    );
  };

  const buildHeroForView = (
    viewSlug: string,
    curRows: typeof currentPerf,
    priorRows: typeof priorPerf,
    convCurrent: number,
    convPrior: number,
    purchaseTotals?: {
      current: number;
      prior: number;
      currentValue: number;
      priorValue: number;
      hasPurchaseConversions?: boolean;
    },
  ): ReportHeroKpisSplit => {
    const includeMeta = viewSlug === "overview" || viewSlug === "meta";
    const cur = aggregateDailyPerf(curRows);
    const prior = aggregateDailyPerf(priorRows);
    const mc = includeMeta ? metaRollupCurrent : emptyMetaRollup();
    const mp = includeMeta ? metaRollupPrior : emptyMetaRollup();
    const ct = normalizeClientType(report.clientType);
    const includeEcommerceSecondaryRow = showEcommerceHeroRow;

    if (hasChannelMetricKeys(metricRows) && isChannelPlatformSlug(viewSlug)) {
      if (ct === "ecommerce") {
        return buildReportHeroKpis({
          clientType: ct,
          visibility: resolveMetricVisibility(ct, legacyRows),
          current: cur,
          prior,
          convCurrent,
          convPrior,
          metaCurrent: mc,
          metaPrior: mp,
          googleQualityCurrent: googleQualityRollup,
          googleQualityPrior: googleQualityPriorRollup,
          overviewGlobalBooleans: channelMerged.booleans,
          purchasesCurrent: purchaseTotals?.current,
          purchasesPrior: purchaseTotals?.prior,
          purchaseValueCurrent: purchaseTotals?.currentValue,
          purchaseValuePrior: purchaseTotals?.priorValue,
          includeEcommerceSecondaryRow,
          alwaysShowEcommerceSecondaryRow: showEcommerceHeroRow,
          compactPrimaryLabels: true,
        });
      }

      const searchLostCurrent = searchLostForPlatformRows(
        curRows,
        viewSlug,
        windows.currentStart,
        windows.currentEnd,
      );
      const searchLostPrior = searchLostForPlatformRows(
        priorRows,
        viewSlug,
        windows.priorStart,
        windows.priorEnd,
      );
      return {
        primary: buildPlatformHeroKpis({
          platformSlug: viewSlug,
          clientType: ct,
          channel: channelMerged.booleans,
          current: cur,
          prior,
          convCurrent,
          convPrior,
          metaCurrent: mc,
          metaPrior: mp,
          googleQualityCurrent: googleQualityRollup,
          googleQualityPrior: googleQualityPriorRollup,
          searchLostCurrent,
          searchLostPrior,
        }),
        secondary: [],
      };
    }

    if (hasChannelMetricKeys(metricRows) && viewSlug === "overview") {
      return buildReportHeroKpis({
        clientType: ct,
        visibility: resolveMetricVisibility(ct, legacyRows),
        current: cur,
        prior,
        convCurrent,
        convPrior,
        metaCurrent: metaRollupCurrent,
        metaPrior: metaRollupPrior,
        googleQualityCurrent: googleQualityRollup,
        googleQualityPrior: googleQualityPriorRollup,
        overviewGlobalBooleans: channelMerged.booleans,
        purchasesCurrent: purchaseTotals?.current,
        purchasesPrior: purchaseTotals?.prior,
        purchaseValueCurrent: purchaseTotals?.currentValue,
        purchaseValuePrior: purchaseTotals?.priorValue,
        includeEcommerceSecondaryRow,
        alwaysShowEcommerceSecondaryRow: showEcommerceHeroRow,
      });
    }

    return buildReportHeroKpis({
      clientType: ct,
      visibility: metricVisibility,
      current: cur,
      prior,
      convCurrent,
      convPrior,
      metaCurrent: mc,
      metaPrior: mp,
      googleQualityCurrent: googleQualityRollup,
      googleQualityPrior: googleQualityPriorRollup,
      purchasesCurrent: purchaseTotals?.current,
      purchasesPrior: purchaseTotals?.prior,
      purchaseValueCurrent: purchaseTotals?.currentValue,
      purchaseValuePrior: purchaseTotals?.priorValue,
      includeEcommerceSecondaryRow,
      alwaysShowEcommerceSecondaryRow: showEcommerceHeroRow,
    });
  };

  const ytdSource =
    activeView === "overview"
      ? ytdPerfAll
      : ytdPerfAll.filter((r) => platformSlugMatchesRow(r.platform, activeView));
  let ytdMonthRows = buildYtdMonthlyTableRows(ytdSource, calendarYear);
  let ytdMonthRowsPriorYear: typeof ytdMonthRows | null = null;
  if (useHudsonOverviewYtdColumns) {
    const purchasesCurrentYear = await fetchHudsonOverviewPurchasesByMonth(
      supabase,
      report.id,
      calendarYear,
    );
    ytdMonthRows = buildYtdMonthlyTableRows(ytdSource, calendarYear, {
      conversionsPlatformSlugs: [...hudsonYtdConversionSlugs],
      purchasesByMonth: purchasesCurrentYear,
    });
  } else if (useMetaEcommerceColumns) {
    const purchasesCurrentYear = await fetchMetaEcommercePurchasesByMonth(
      supabase,
      report.id,
      calendarYear,
    );
    ytdMonthRows = buildYtdMonthlyTableRows(ytdSource, calendarYear, {
      purchasesByMonth: purchasesCurrentYear,
    });
  } else if (useGoogleEcommerceColumns) {
    const purchasesCurrentYear = await fetchGoogleEcommercePurchasesByMonth(
      supabase,
      report.id,
      calendarYear,
    );
    ytdMonthRows = buildYtdMonthlyTableRows(ytdSource, calendarYear, {
      purchasesByMonth: purchasesCurrentYear,
    });
  }
  if (showPriorYearYtd) {
    const ytdSourcePriorYear =
      activeView === "overview"
        ? ytdPerfPriorYear
        : ytdPerfPriorYear.filter((r) => platformSlugMatchesRow(r.platform, activeView));
    if (useHudsonOverviewYtdColumns) {
      const purchasesPriorYear = await fetchHudsonOverviewPurchasesByMonth(
        supabase,
        report.id,
        priorCalendarYear,
      );
      ytdMonthRowsPriorYear = buildYtdMonthlyTableRows(ytdSourcePriorYear, priorCalendarYear, {
        asOfIsoDate: `${priorCalendarYear}-12-31`,
        conversionsPlatformSlugs: [...hudsonYtdConversionSlugs],
        purchasesByMonth: purchasesPriorYear,
      });
    } else if (useMetaEcommerceColumns) {
      const purchasesPriorYear = await fetchMetaEcommercePurchasesByMonth(
        supabase,
        report.id,
        priorCalendarYear,
      );
      ytdMonthRowsPriorYear = buildYtdMonthlyTableRows(ytdSourcePriorYear, priorCalendarYear, {
        asOfIsoDate: `${priorCalendarYear}-12-31`,
        purchasesByMonth: purchasesPriorYear,
      });
    } else if (useGoogleEcommerceColumns) {
      const purchasesPriorYear = await fetchGoogleEcommercePurchasesByMonth(
        supabase,
        report.id,
        priorCalendarYear,
      );
      ytdMonthRowsPriorYear = buildYtdMonthlyTableRows(ytdSourcePriorYear, priorCalendarYear, {
        asOfIsoDate: `${priorCalendarYear}-12-31`,
        purchasesByMonth: purchasesPriorYear,
      });
    } else {
      ytdMonthRowsPriorYear = buildYtdMonthlyTableRows(ytdSourcePriorYear, priorCalendarYear, {
        asOfIsoDate: `${priorCalendarYear}-12-31`,
      });
    }
  }
  const showPriorYearYtdSideBySide =
    showPriorYearYtd &&
    ytdMonthRowsPriorYear != null &&
    ytdMonthRowsHaveMetrics(ytdMonthRowsPriorYear, {
      useEcommerceColumns: ytdUseEcommerceColumns,
      useHudsonOverviewColumns: ytdUseHudsonOverviewColumns,
      useBackClinicsSlimYtdColumns,
    });


  let heroGated: ReportHeroKpisSplit;
  let conversionBreakdown: Awaited<ReturnType<typeof fetchConversionBreakdownCards>>;
  let chartData: ReportSeriesPoint[];
  let channels: ChannelSummary[];
  let campaignRows: Awaited<ReturnType<typeof fetchCampaignPerformanceRows>> = [];
  let locationBreakdown: MetaLocationBreakdownState | null = null;
  let googleLocationBreakdown: LocationBreakdownState | null = null;
  let googleAdsCampaignTable: GoogleAdsCampaignTableState | null = null;
  let microsoftAdsCampaignTable: GoogleAdsCampaignTableState | null = null;
  let sidebarGroups: SidebarGroup[];
  let ghlReportData: Awaited<ReturnType<typeof fetchGhlReportData>> | null = null;
  let whatConvertsReportData: Awaited<ReturnType<typeof fetchWhatConvertsReportData>> | null =
    null;

  const useSplitHeroLayout =
    !isGhlView &&
    !isWhatConvertsView &&
    (showEcommerceHeroRow ||
      (hasChannelMetricKeys(metricRows) &&
        (activeView === "overview" ||
          (isEcommerceClient && isChannelPlatformSlug(activeView)))));

  if (activeView === "ghl") {
    sidebarGroups = await sidebarGroupsPromise;
    heroGated = { primary: [], secondary: [] };
    conversionBreakdown = [];
    chartData = [];
    channels = [];
    if (report.ghlPipelineConfig) {
      ghlReportData = await fetchGhlReportData(
        supabase,
        report.id,
        report.ghlPipelineConfig,
      );
    }
  } else if (activeView === "whatconverts") {
    sidebarGroups = await sidebarGroupsPromise;
    heroGated = { primary: [], secondary: [] };
    conversionBreakdown = [];
    chartData = [];
    channels = [];
    if (report.whatconvertsProfileId) {
      whatConvertsReportData = await fetchWhatConvertsReportData(
        supabase,
        report.id,
        windows,
        report.whatconvertsConfig,
      );
    }
  } else if (activeView === "overview") {
    const purchaseTotalsPromise = fetchHeroPurchaseTotals("overview");

    const [conversionTotals, purchaseTotals, breakdown, channelConversionsByPlatform, side] =
      await Promise.all([
      fetchConfiguredConversionTotals(supabase, report.id, windows, activeConvPairs),
      purchaseTotalsPromise,
      fetchConversionBreakdownCards(
        supabase,
        report.id,
        windows,
        activeConvPairs,
        null,
        breakdownFetchOpts,
      ),
      fetchConversionTotalsByDisplayPlatform(
        supabase,
        report.id,
        windows.currentStart,
        windows.currentEnd,
        activeConvPairs,
      ),
      sidebarGroupsPromise,
    ]);
    heroGated = buildHeroForView(
      activeView,
      currentPerf,
      priorPerf,
      conversionTotals.current,
      conversionTotals.prior,
      purchaseTotals,
    );
    conversionBreakdown = breakdown;
    chartData = buildChartData(currentPerf, windows.currentStart, windows.currentEnd);
    channels = buildChannelSummary(
      filterDailyPerfRowsByTabSlugs(currentPerf, tabSlugSet),
      channelConversionsByPlatform,
    ).filter((c) => c.spend > 0 || c.conversions > 0);
    sidebarGroups = side;
  } else {
    const slug = activeView;
    if (slug === "google") {
      const purchaseTotalsPromise = fetchHeroPurchaseTotals(slug);

      const [convPlat, purchaseTotals, breakdownPlat, googleState, googleCampaignRows, side, googleLocBreakdown] =
        await Promise.all([
        sumActiveConversionsForPlatform(supabase, report.id, windows, activeConvPairs, slug),
        purchaseTotalsPromise,
        fetchConversionBreakdownCards(
          supabase,
          report.id,
          windows,
          activeConvPairs,
          slug,
          breakdownFetchOpts,
        ),
        useGoogleEcommerceColumns
          ? Promise.resolve(null)
          : fetchAdsCampaignTableState(
              supabase,
              report.id,
              windows.currentStart,
              windows.currentEnd,
              "google",
            ),
        useGoogleEcommerceColumns
          ? fetchCampaignPerformanceRows(
              supabase,
              report.id,
              slug,
              windows.currentStart,
              windows.currentEnd,
              { isEcommerceClient: true },
            )
          : Promise.resolve([]),
        sidebarGroupsPromise,
        chb[GOOGLE_SHOW_LOCATION_BREAKDOWN_KEY] === true
          ? fetchGoogleLocationBreakdown(supabase, report.id)
          : Promise.resolve(null),
      ]);
      const curPlat = currentPerf.filter((r) => platformSlugMatchesRow(r.platform, slug));
      const priorPlat = priorPerf.filter((r) => platformSlugMatchesRow(r.platform, slug));
      heroGated = buildHeroForView(
        activeView,
        curPlat,
        priorPlat,
        convPlat.current,
        convPlat.prior,
        purchaseTotals ?? undefined,
      );
      conversionBreakdown = breakdownPlat;
      chartData = buildChartDataForRows(curPlat, windows.currentStart, windows.currentEnd);
      channels = [];
      campaignRows = useGoogleEcommerceColumns ? googleCampaignRows : [];
      googleAdsCampaignTable = googleState;
      googleLocationBreakdown = googleLocBreakdown;
      microsoftAdsCampaignTable = null;
      sidebarGroups = side;
    } else if (slug === "microsoft") {
      const purchaseTotalsPromise = isEcommerceClient
        ? fetchPurchaseConversionTotals(supabase, report.id, windows, activeConvPairs, slug)
        : Promise.resolve(null);

      const [convPlat, purchaseTotals, breakdownPlat, msCampaignState, side] = await Promise.all([
        sumActiveConversionsForPlatform(supabase, report.id, windows, activeConvPairs, slug),
        purchaseTotalsPromise,
        fetchConversionBreakdownCards(
          supabase,
          report.id,
          windows,
          activeConvPairs,
          slug,
          breakdownFetchOpts,
        ),
        fetchAdsCampaignTableState(
          supabase,
          report.id,
          windows.currentStart,
          windows.currentEnd,
          "microsoft",
        ),
        sidebarGroupsPromise,
      ]);
      const curPlat = currentPerf.filter((r) => platformSlugMatchesRow(r.platform, slug));
      const priorPlat = priorPerf.filter((r) => platformSlugMatchesRow(r.platform, slug));
      heroGated = buildHeroForView(
        activeView,
        curPlat,
        priorPlat,
        convPlat.current,
        convPlat.prior,
        purchaseTotals ?? undefined,
      );
      conversionBreakdown = breakdownPlat;
      chartData = buildChartDataForRows(curPlat, windows.currentStart, windows.currentEnd);
      channels = [];
      campaignRows = [];
      googleAdsCampaignTable = null;
      microsoftAdsCampaignTable = msCampaignState;
      sidebarGroups = side;
    } else {
      const purchaseTotalsPromise = fetchHeroPurchaseTotals(slug);

      const [convPlat, purchaseTotals, breakdownPlat, campRows, side, locBreakdown] =
        await Promise.all([
        sumActiveConversionsForPlatform(supabase, report.id, windows, activeConvPairs, slug),
        purchaseTotalsPromise,
        fetchConversionBreakdownCards(
          supabase,
          report.id,
          windows,
          activeConvPairs,
          slug,
          breakdownFetchOpts,
        ),
        slug === "meta"
          ? useMetaEcommerceColumns
            ? fetchCampaignPerformanceRows(
                supabase,
                report.id,
                slug,
                windows.currentStart,
                windows.currentEnd,
                { isEcommerceClient: true },
              )
            : fetchMetaCampaignRowsForReport(
                supabase,
                report.id,
                windows.currentStart,
                windows.currentEnd,
                chb,
              )
          : fetchCampaignPerformanceRows(
              supabase,
              report.id,
              slug,
              windows.currentStart,
              windows.currentEnd,
            ),
        sidebarGroupsPromise,
        slug === "meta" && chb[META_SHOW_LOCATION_BREAKDOWN_KEY] === true
          ? fetchMetaLocationBreakdown(supabase, report.id)
          : Promise.resolve(null),
      ]);
      const curPlat = currentPerf.filter((r) => platformSlugMatchesRow(r.platform, slug));
      const priorPlat = priorPerf.filter((r) => platformSlugMatchesRow(r.platform, slug));
      heroGated = buildHeroForView(
        activeView,
        curPlat,
        priorPlat,
        convPlat.current,
        convPlat.prior,
        purchaseTotals ?? undefined,
      );
      conversionBreakdown = breakdownPlat;
      chartData = buildChartDataForRows(curPlat, windows.currentStart, windows.currentEnd);
      channels = [];
      campaignRows = campRows;
      locationBreakdown = locBreakdown;
      googleAdsCampaignTable = null;
      microsoftAdsCampaignTable = null;
      sidebarGroups = side;
    }
  }

  const detailAdsCampaignState =
    activeView === "google"
      ? googleAdsCampaignTable
      : activeView === "microsoft"
        ? microsoftAdsCampaignTable
        : null;
  const detailAdsPlatform = activeView === "microsoft" ? "microsoft" : "google";

  const allowGoogleCampaign =
    !hasChannelMetricKeys(metricRows) || chb.google_show_campaign_table !== false;
  const allowMicrosoftCampaign =
    !hasChannelMetricKeys(metricRows) || chb.microsoft_show_campaign_table !== false;

  const googleConvIds = googleAdsCampaignTable?.conversionColumns.map((c) => c.id) ?? [];
  const googleCampaignColVisibility = buildGoogleCampaignColumnVisibility(chb, googleConvIds);
  const microsoftCampaignColVisibility = buildMicrosoftCampaignColumnVisibility(chb);
  const metaCampaignColVisibility = buildMetaCampaignColumnVisibility(chb);
  const ytdColVisibility = hasChannelMetricKeys(metricRows)
    ? buildYtdColumnVisibility(
        activeView,
        chb,
        tabPlatforms.map((t) => t.slug),
      )
    : undefined;

  const showYtdTable =
    activeView !== "meta" ||
    !hasChannelMetricKeys(metricRows) ||
    chb.meta_show_ytd_table !== false;

  const reportContent = (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-10 sm:px-8">
      <header className="mb-10 grid grid-cols-1 items-center gap-6 md:grid-cols-3">
        <div className="flex items-center md:justify-start">
          <AgencyLogo
            src={report.agencyLogoUrl}
            agencyName={report.agencyName}
            agencyPrimaryColor={report.agencyPrimaryColor}
            placeholderClassName="h-10 w-36 rounded-md"
            imgClassName="h-10 w-auto max-w-[min(100%,14rem)] object-contain object-left"
          />
        </div>
        <h1 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
          {report.clientName}
        </h1>
        <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end">
          <DateRangeDropdown
            primaryColor={report.agencyPrimaryColor}
            initialRange={rangeParam}
            initialStart={rangeStartParam}
            initialEnd={rangeEndParam}
          />
          <DownloadPdfButton
            clientSlug={slug}
            primaryColor={report.agencyPrimaryColor}
          />
        </div>
      </header>

      <ReportTabNav
        clientSlug={slug}
        range={rangeParam}
        start={rangeStartParam}
        end={rangeEndParam}
        primaryColor={report.agencyPrimaryColor}
        activeSlug={activeView}
        platformTabs={tabPlatforms}
        showOverviewTab={showOverviewTab}
        navBasePath={navBasePath}
        navPreservedQuery={navPreservedQuery}
      />

      {isGhlView ? (
        ghlReportData ? (
          <GhlReportTab data={ghlReportData} accentColor={report.agencyPrimaryColor} />
        ) : (
          <p className="mb-12 text-center text-sm text-zinc-500">
            CRM reporting is not configured for this client yet.
          </p>
        )
      ) : isWhatConvertsView ? (
        whatConvertsReportData ? (
          <WhatConvertsReportTab
            data={whatConvertsReportData}
            accentColor={report.agencyPrimaryColor}
          />
        ) : (
          <p className="mb-12 text-center text-sm text-zinc-500">
            WhatConverts reporting is not configured for this client yet.
          </p>
        )
      ) : (
        <>
      {useSplitHeroLayout ? (
        <>
          {heroGated.primary.length > 0 ? (
            <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
              {heroGated.primary.map((kpi) => (
                <KpiCard key={`hero-p-${kpi.label}`} kpi={kpi} accentColor={report.agencyPrimaryColor} />
              ))}
            </section>
          ) : null}
          {heroGated.secondary.length > 0 ? (
            <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
              {heroGated.secondary.map((kpi) => (
                <KpiCard key={`hero-s-${kpi.label}`} kpi={kpi} accentColor={report.agencyPrimaryColor} />
              ))}
            </section>
          ) : null}
        </>
      ) : (
        <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          {flattenReportHeroKpis(heroGated).map((kpi) => (
            <KpiCard key={kpi.label} kpi={kpi} accentColor={report.agencyPrimaryColor} />
          ))}
        </section>
      )}

      {showHeroChartSection ? (
        <>
          <h2 className="mb-4 text-center text-base font-semibold text-zinc-900">
            Performance Trends
          </h2>
          <section
            className="mb-10 rounded-xl border border-zinc-200 bg-white p-4 sm:p-6"
            style={{ borderTopWidth: "3px", borderTopColor: report.agencyPrimaryColor }}
          >
            <PerformanceLineChart
              primaryColor={report.agencyPrimaryColor}
              data={chartData}
              initialChartMode={reportChartMode}
            />
          </section>
        </>
      ) : null}

      {showConversionBreakdownSection && conversionBreakdown.length > 0 ? (
        <>
          <h2 className={`${REPORT_FOCUS_SECTION_TITLE} mb-4`}>Conversion Breakdown</h2>
          <ConversionBreakdownCards accentColor={report.agencyPrimaryColor} items={conversionBreakdown} />
        </>
      ) : null}

      {activeView === "overview" ? (
        channels.length > 0 ? (
          <>
            <h2 className="mb-4 text-center text-base font-semibold text-zinc-900">
              Channel Breakdown
            </h2>
            <section className={`mb-12 ${reportCardRowLayoutClass(channels.length)}`}>
              {channels.map((channel) => (
                <div
                  key={channel.name}
                  className={`rounded-xl border border-zinc-200 bg-white p-5 ${reportCardItemShellClass(channels.length)}`}
                >
                  <h3 className="mb-4 text-center text-sm font-semibold uppercase tracking-wide text-zinc-500">
                    {channel.name}
                  </h3>
                  <div className="space-y-3">
                    <ChannelMetric label="Spend" value={formatCurrency(channel.spend)} />
                    <ChannelMetric label="Conversions" value={formatWhole(channel.conversions)} />
                    <ChannelMetric
                      label="Cost per Conversion"
                      value={formatCurrency(channel.spend / Math.max(channel.conversions, 1))}
                    />
                  </div>
                </div>
              ))}
            </section>
          </>
        ) : null
      ) : (activeView === "google" || activeView === "microsoft") &&
        detailAdsCampaignState &&
        !useGoogleEcommerceColumns ? (
        <section className="mb-12 space-y-8">
          {(activeView === "google" ? allowGoogleCampaign : allowMicrosoftCampaign) ? (
            <div>
              <h2 className={`${REPORT_FOCUS_SECTION_TITLE} mb-4`}>Campaign Performance</h2>
              <GoogleAdsCampaignPerformanceTable
                primaryColor={report.agencyPrimaryColor}
                clientId={report.id}
                canRunCampaignSync={false}
                state={detailAdsCampaignState}
                platform={detailAdsPlatform}
                columnVisibility={
                  activeView === "google" ? googleCampaignColVisibility : microsoftCampaignColVisibility
                }
              />
            </div>
          ) : null}
        </section>
      ) : !(activeView === "meta" && hasChannelMetricKeys(metricRows) && chb.meta_show_campaign_table === false) ? (
        <section className="mb-12">
          <h2 className={`${REPORT_FOCUS_SECTION_TITLE} mb-4`}>Campaign Performance</h2>
          <CampaignPerformanceTable
            rows={campaignRows}
            useMetaReachColumns={canonicalReportPlatformSlug(activeView) === "meta"}
            useMetaEcommerceColumns={useMetaEcommerceColumns}
            useGoogleEcommerceColumns={useGoogleEcommerceColumns}
            columnVisibility={
              canonicalReportPlatformSlug(activeView) === "meta" && !useMetaEcommerceColumns
                ? metaCampaignColVisibility
                : undefined
            }
          />
        </section>
      ) : null}

      {showYtdTable ? (
        <>
          <h2 className="mb-4 text-center text-base font-semibold text-zinc-900">
            Year to Date
          </h2>
          <section
            className="mb-12 rounded-xl border border-zinc-200 bg-white p-4 sm:p-6"
            style={{ borderTopWidth: "3px", borderTopColor: report.agencyPrimaryColor }}
          >
            {showPriorYearYtdSideBySide ? (
              <YtdYearComparison
                rowsCurrentYear={ytdMonthRows}
                rowsPriorYear={ytdMonthRowsPriorYear!}
                currentYear={calendarYear}
                priorYear={priorCalendarYear}
                useEcommerceColumns={ytdUseEcommerceColumns}
                useHudsonOverviewColumns={ytdUseHudsonOverviewColumns}
                useBackClinicsSlimYtdColumns={useBackClinicsSlimYtdColumns}
                columnVisibility={
                  ytdUseEcommerceColumns ||
                  ytdUseHudsonOverviewColumns ||
                  useBackClinicsSlimYtdColumns
                    ? undefined
                    : ytdColVisibility
                }
                hideTikTokColumns={hideTikTokYtdColumns}
              />
            ) : (
              <YtdMonthlyTable
                rows={ytdMonthRows}
                columnVisibility={
                  useBackClinicsSlimYtdColumns ? undefined : ytdColVisibility
                }
                useEcommerceColumns={ytdUseEcommerceColumns}
                useHudsonOverviewColumns={ytdUseHudsonOverviewColumns}
                useBackClinicsSlimYtdColumns={useBackClinicsSlimYtdColumns}
                hideTikTokColumns={hideTikTokYtdColumns}
              />
            )}
          </section>
        </>
      ) : null}

      {activeView === "meta" &&
      chb[META_SHOW_LOCATION_BREAKDOWN_KEY] === true &&
      locationBreakdown ? (
        <MetaLocationBreakdownSection state={locationBreakdown} />
      ) : null}

      {activeView === "google" &&
      chb[GOOGLE_SHOW_LOCATION_BREAKDOWN_KEY] === true &&
      googleLocationBreakdown ? (
        <LocationBreakdownSection state={googleLocationBreakdown} />
      ) : null}
        </>
      )}

      <footer className="pb-2 text-center text-sm text-zinc-400">
        Powered by {report.agencyName}
      </footer>
    </div>
  );

  if (embedded) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white text-zinc-900">
        {reportContent}
      </div>
    );
  }

  return (
    <div className="-mx-4 -mb-4 flex min-h-[calc(100vh-3.5rem)] bg-white text-zinc-900 md:-mx-6 md:flex">
      <ReportSidebar
        groups={sidebarGroups}
        currentSlug={slug}
        logoUrl={report.agencyLogoUrl}
        agencyName={report.agencyName}
        primaryColor={report.agencyPrimaryColor}
      />
      <section className="w-full overflow-auto md:flex-1">{reportContent}</section>
    </div>
  );
}

function formatKpiDisplayValue(kpi: KpiStat, value: number): string {
  if (kpi.format === "currency") return formatCurrency(value);
  if (kpi.format === "percent") return `${value.toFixed(1)}%`;
  if (kpi.format === "multiplier") return `${value.toFixed(2)}x`;
  return formatWhole(value);
}

function KpiCard({ kpi, accentColor }: { kpi: KpiStat; accentColor: string }) {
  const deltaPct = kpi.prior > 0 ? ((kpi.current - kpi.prior) / kpi.prior) * 100 : 0;
  const favorable = kpi.lowerIsBetter ? deltaPct <= 0 : deltaPct >= 0;
  const arrow = deltaPct >= 0 ? "▲" : "▼";
  return (
    <div
      className="rounded-xl border border-zinc-200 bg-white p-5 text-center"
      style={{ borderTopWidth: "3px", borderTopColor: accentColor }}
    >
      <p className="mb-2 text-base font-semibold leading-snug text-zinc-800">{kpi.label}</p>
      <p className="text-2xl font-bold tracking-tight text-zinc-900">
        {formatKpiDisplayValue(kpi, kpi.current)}
      </p>
      <p className="mt-2 text-xs text-zinc-400">
        Prior: {formatKpiDisplayValue(kpi, kpi.prior)}
      </p>
      <p className={`mt-1 text-xs font-medium ${favorable ? "text-emerald-600" : "text-red-600"}`}>
        {arrow} {Math.abs(deltaPct).toFixed(1)}%
      </p>
    </div>
  );
}

function ChannelMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-zinc-500">{label}</span>
      <span className="shrink-0 text-sm font-semibold text-zinc-900">{value}</span>
    </div>
  );
}

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatWhole(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

type DateRangeSelection =
  | { kind: DateRangePreset }
  | { kind: "custom"; start: string; end: string };

function normalizeRangeSelection(
  input?: string,
  customStart?: string,
  customEnd?: string,
): DateRangeSelection {
  const preset = (input ?? "").trim().toLowerCase();
  if (
    preset === "custom" &&
    isIsoDate(customStart) &&
    isIsoDate(customEnd) &&
    customStart <= customEnd
  ) {
    return { kind: "custom", start: customStart, end: customEnd };
  }
  if (preset === "last_7" || preset === "mtd" || preset === "last_month") {
    return { kind: preset };
  }
  return { kind: "last_30" };
}

function getWindows(selection: DateRangeSelection): DateWindow {
  if (selection.kind === "custom") {
    const currentStart = selection.start;
    const currentEnd = selection.end;
    const days = diffDaysInclusive(currentStart, currentEnd);
    const priorEndDate = new Date(`${currentStart}T00:00:00.000Z`);
    priorEndDate.setUTCDate(priorEndDate.getUTCDate() - 1);
    const priorEnd = isoDate(priorEndDate);
    const priorStartDate = new Date(`${priorEnd}T00:00:00.000Z`);
    priorStartDate.setUTCDate(priorStartDate.getUTCDate() - (days - 1));
    const priorStart = isoDate(priorStartDate);
    return { currentStart, currentEnd, priorStart, priorEnd };
  }

  if (selection.kind === "last_month") {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const firstThisMonth = new Date(Date.UTC(y, m, 1));
    const lastPrevMonthEnd = addDaysUTC(firstThisMonth, -1);
    const currentStart = isoDate(
      new Date(Date.UTC(lastPrevMonthEnd.getUTCFullYear(), lastPrevMonthEnd.getUTCMonth(), 1)),
    );
    const currentEnd = isoDate(lastPrevMonthEnd);
    const priorEnd = isoDate(addDaysUTC(new Date(`${currentStart}T00:00:00.000Z`), -1));
    const priorEndDate = new Date(`${priorEnd}T00:00:00.000Z`);
    const priorStart = isoDate(
      new Date(Date.UTC(priorEndDate.getUTCFullYear(), priorEndDate.getUTCMonth(), 1)),
    );
    return { currentStart, currentEnd, priorStart, priorEnd };
  }

  const today = new Date();
  const yesterday = addDaysUTC(today, -1);
  const currentEnd = isoDate(yesterday);
  const start = new Date(`${currentEnd}T00:00:00.000Z`);

  if (selection.kind === "last_7") {
    start.setUTCDate(start.getUTCDate() - 6);
  } else if (selection.kind === "last_30") {
    start.setUTCDate(start.getUTCDate() - 29);
  } else {
    start.setUTCDate(1);
  }

  const currentStart = isoDate(start);
  const currentDays = diffDaysInclusive(currentStart, currentEnd);
  const priorEndDate = new Date(`${currentStart}T00:00:00.000Z`);
  priorEndDate.setUTCDate(priorEndDate.getUTCDate() - 1);
  const priorEnd = isoDate(priorEndDate);
  const priorStartDate = new Date(`${priorEnd}T00:00:00.000Z`);
  priorStartDate.setUTCDate(priorStartDate.getUTCDate() - (currentDays - 1));
  const priorStart = isoDate(priorStartDate);
  return { currentStart, currentEnd, priorStart, priorEnd };
}

function isIsoDate(v?: string): v is string {
  return !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

async function fetchClientReportMeta(
  supabase: ReturnType<typeof createServiceClient>,
  clientSlug: string,
): Promise<ReportClient | null> {
  const { data: client, error: cErr } = await supabase
    .from("clients")
    .select(
      "id, name, agency_id, report_slug, client_type, default_chart_mode, show_prior_year_ytd, show_ecommerce_hero_row, ghl_pipeline_config, whatconverts_profile_id, whatconverts_config",
    )
    .eq("report_slug", clientSlug)
    .maybeSingle();
  if (cErr) throw cErr;
  if (!client) return null;

  const { data: agency, error: aErr } = await supabase
    .from("agencies")
    .select("name, logo_url, primary_color, secondary_color")
    .eq("id", client.agency_id)
    .maybeSingle();
  if (aErr) throw aErr;

  const chartMode =
    client.default_chart_mode === "traffic" ? "traffic" : "conversions";

  return {
    id: client.id,
    slug: client.report_slug ?? clientSlug,
    agencyId: client.agency_id,
    clientName: client.name,
    clientType: client.client_type ?? "lead_gen",
    showPriorYearYtd: client.show_prior_year_ytd === true,
    showEcommerceHeroRow: client.show_ecommerce_hero_row === true,
    defaultChartMode: chartMode,
    agencyName: agency?.name ?? "Agency",
    agencyLogoUrl: normalizeAgencyLogoUrl(agency?.logo_url),
    agencyPrimaryColor: agency?.primary_color ?? "#2563EB",
    agencySecondaryColor: agency?.secondary_color ?? null,
    contactEmail: "team@agency.com",
    ghlPipelineConfig: parseGhlPipelineConfig(client.ghl_pipeline_config),
    whatconvertsProfileId: client.whatconverts_profile_id?.trim() || null,
    whatconvertsConfig: parseWhatConvertsConfig(client.whatconverts_config),
  };
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function diffDaysInclusive(startIso: string, endIso: string): number {
  const start = new Date(`${startIso}T00:00:00.000Z`);
  const end = new Date(`${endIso}T00:00:00.000Z`);
  return Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
}

function addDaysUTC(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

