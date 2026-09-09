/** Client lifecycle statuses on public.clients.status (text column). */
export const CLIENT_STATUSES = [
  "active",
  "setup",
  "inactive",
  "prospect",
  "on_hold",
  "churned",
] as const;

export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  active: "Active",
  setup: "Setup",
  inactive: "Inactive",
  prospect: "Lead",
  on_hold: "Paused",
  churned: "Churned",
};
