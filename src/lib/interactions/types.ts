import type { InteractionChannel, InteractionType } from "@/lib/types";

export type { InteractionChannel, InteractionType };

export type InteractionContactRef = {
  id: string;
  name: string;
};

export type InteractionAttendeeRow = {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
};

export type InteractionRow = {
  id: string;
  type: InteractionType;
  channel: InteractionChannel | null;
  summary: string;
  body: string | null;
  occurred_at: string;
  logged_by: string | null;
  logged_by_name: string | null;
  client_id?: string;
  contact_id: string | null;
  contact_name: string | null;
  contact_ids: string[];
  contacts: InteractionContactRef[];
  attendees: InteractionAttendeeRow[];
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
