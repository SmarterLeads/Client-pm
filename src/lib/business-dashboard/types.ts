export type BusinessDashboardKpis = {
  activeClients: number;
  totalMrrCadCents: number;
  averageMrrCadCents: number | null;
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
