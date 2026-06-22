-- Back Clinics (and future clients): GHL custom field dates + raw payload.

alter table public.ghl_opportunities
  add column if not exists appointment_booked_date timestamptz,
  add column if not exists customer_won_date timestamptz,
  add column if not exists consultation_attended_date timestamptz,
  add column if not exists custom_fields jsonb not null default '{}'::jsonb;

alter table public.ghl_contacts
  add column if not exists appointment_booked_date timestamptz,
  add column if not exists customer_won_date timestamptz,
  add column if not exists consultation_attended_date timestamptz,
  add column if not exists custom_fields jsonb not null default '{}'::jsonb;

comment on column public.ghl_opportunities.appointment_booked_date is
  'Parsed from GHL opportunity custom field "Appointment Booked Date".';
comment on column public.ghl_opportunities.customer_won_date is
  'Parsed from GHL opportunity custom field "Customer Won Date".';
comment on column public.ghl_opportunities.consultation_attended_date is
  'Parsed from GHL opportunity custom field "Consultation Attended Date".';
comment on column public.ghl_opportunities.custom_fields is
  'Raw customFields array from GHL opportunity API response.';

comment on column public.ghl_contacts.appointment_booked_date is
  'Parsed from GHL contact custom field "Appointment Booked Date".';
comment on column public.ghl_contacts.customer_won_date is
  'Parsed from GHL contact custom field "Customer Won Date".';
comment on column public.ghl_contacts.consultation_attended_date is
  'Parsed from GHL contact custom field "Consultation Attended Date".';
comment on column public.ghl_contacts.custom_fields is
  'Raw customFields array from GHL contact API response.';
