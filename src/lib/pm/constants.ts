/** Client lifecycle statuses on public.clients (string column, not a DB enum in shared project). */
export const CLIENT_STATUSES = [
  "active",
  "inactive",
  "prospect",
  "on_hold",
  "churned",
] as const;

export type ClientStatus = (typeof CLIENT_STATUSES)[number];
