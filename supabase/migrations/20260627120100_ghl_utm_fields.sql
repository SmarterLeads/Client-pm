-- Back Clinics UTM custom fields parsed from GHL contact/opportunity payloads.

alter table public.ghl_opportunities
  add column if not exists utm_source text,
  add column if not exists utm_medium text;

alter table public.ghl_contacts
  add column if not exists utm_source text,
  add column if not exists utm_medium text;

comment on column public.ghl_opportunities.utm_source is
  'Parsed from GHL opportunity custom field utm source.';
comment on column public.ghl_opportunities.utm_medium is
  'Parsed from GHL opportunity custom field UTM-Medium.';
comment on column public.ghl_contacts.utm_source is
  'Parsed from GHL contact custom field UTM Source.';
comment on column public.ghl_contacts.utm_medium is
  'Parsed from GHL contact custom field UTM Medium.';
