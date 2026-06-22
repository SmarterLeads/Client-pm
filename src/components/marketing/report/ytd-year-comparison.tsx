import type { YtdMonthTableRow } from "@/lib/marketing/report/report-tab-platform";

import { YtdMonthlyTable } from "./ytd-monthly-table";

type Props = {
  rowsCurrentYear: YtdMonthTableRow[];
  rowsPriorYear: YtdMonthTableRow[];
  currentYear: number;
  priorYear: number;
  useEcommerceColumns?: boolean;
  useHudsonOverviewColumns?: boolean;
  useBackClinicsSlimYtdColumns?: boolean;
  columnVisibility?: Record<string, boolean>;
  hideTikTokColumns?: boolean;
};

export function YtdYearComparison({
  rowsCurrentYear,
  rowsPriorYear,
  currentYear,
  priorYear,
  useEcommerceColumns = false,
  useHudsonOverviewColumns = false,
  useBackClinicsSlimYtdColumns = false,
  columnVisibility,
  hideTikTokColumns = false,
}: Props) {
  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-6">
      <div className="min-w-0 flex-1">
        <h3 className="mb-3 text-center text-sm font-semibold text-zinc-800">
          {currentYear} Year to Date
        </h3>
        <YtdMonthlyTable
          rows={rowsCurrentYear}
          useEcommerceColumns={useEcommerceColumns}
          useHudsonOverviewColumns={useHudsonOverviewColumns}
          useBackClinicsSlimYtdColumns={useBackClinicsSlimYtdColumns}
          columnVisibility={columnVisibility}
          hideTikTokColumns={hideTikTokColumns}
        />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="mb-3 text-center text-sm font-semibold text-zinc-800">{priorYear}</h3>
        <YtdMonthlyTable
          rows={rowsPriorYear}
          useEcommerceColumns={useEcommerceColumns}
          useHudsonOverviewColumns={useHudsonOverviewColumns}
          useBackClinicsSlimYtdColumns={useBackClinicsSlimYtdColumns}
          columnVisibility={columnVisibility}
          hideTikTokColumns={hideTikTokColumns}
        />
      </div>
    </div>
  );
}
