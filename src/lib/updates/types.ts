export type ClientUpdateRow = {
  id: string;
  marketing_channel: string;
  summary: string;
  occurred_at: string;
  logged_by: string | null;
  logged_by_name: string | null;
};

export type ClientUpdateFilters = {
  from?: string;
  to?: string;
  channel?: string;
  loggedBy?: string;
};
