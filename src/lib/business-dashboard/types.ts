export type BusinessDashboardKpis = {
  activeClients: number;
  totalMrrCadCents: number;
  averageMrrCadCents: number | null;
  newClientsLast30Days: number;
  churnedLast30Days: number;
};

export type BusinessDashboardServiceRow = {
  channel: string;
  label: string;
  clientCount: number;
};

export type BusinessDashboardMrrServiceRow = {
  channel: string;
  label: string;
  mrrCadCents: number;
  clientCount: number;
  averageMrrCadCents: number;
};

export type BusinessDashboardServiceOverviewRow = {
  channel: string;
  label: string;
  clientCount: number;
  mrrCadCents: number;
  averageMrrCadCents: number | null;
};

export type BusinessDashboardAgencyRow = {
  id: string;
  name: string;
  primaryColor: string | null;
  activeClients: number;
  totalMrrCadCents: number;
  averageMrrCadCents: number | null;
  churnedLast30Days: number;
};

export type BusinessDashboardMonthlyResultRow = {
  monthStart: string;
  monthLabel: string;
  activeClients: number;
  totalMrrCadCents: number;
  newClients: number;
  churnedClients: number;
  isCurrentMonth: boolean;
};

export type MonthlyFinancialRow = {
  month: number;
  monthLabel: string;
  cdnSalesCents: number;
  cdnExpCents: number;
  usSalesCents: number;
  usExpCents: number;
  totalSalesCadCents: number;
  totalExpCadCents: number;
  profitCadCents: number;
};

export type MonthlyFinancialSaveInput = {
  cdnSalesCents: number;
  cdnExpCents: number;
  usSalesCents: number;
  usExpCents: number;
};
