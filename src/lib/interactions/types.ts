import type { InteractionChannel, InteractionType } from "@/lib/types";

export type { InteractionChannel, InteractionType };

export type InteractionRow = {
  id: string;
  type: InteractionType;
  channel: InteractionChannel | null;
  summary: string;
  body: string | null;
  occurred_at: string;
  logged_by_name: string | null;
  contact_name: string | null;
};

export type GlobalInteractionRow = InteractionRow & {
  client_id: string;
  client_name: string;
};

export type InteractionListFilters = {
  type?: InteractionType;
  client_id?: string;
  from?: string;
  to?: string;
  q?: string;
};

export type ClientInteractionFilters = {
  type?: InteractionType;
  from?: string;
  to?: string;
};

export type ClientSelectOption = { id: string; name: string };
