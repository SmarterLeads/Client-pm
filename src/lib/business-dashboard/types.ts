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
  cdnSales: number;
  cdnExpenses: number;
  usdSales: number;
  usdExpenses: number;
  totalSalesCad: number;
  totalExpCad: number;
  profitCad: number;
};

export type MonthlyFinancialSaveInput = {
  cdnSales: number;
  cdnExpenses: number;
  usdSales: number;
  usdExpenses: number;
};

export type HourlyBillingRow = {
  clientId: string;
  clientName: string;
  agencyName: string | null;
  hourlyRate: number;
  currency: string;
  hours: number;
  amountDue: number;
};
