-- Event name used to match conversion_events (stored as client_conversions.raw_name).

ALTER TABLE public.client_conversion_goals
  ADD COLUMN IF NOT EXISTS event_name text;

UPDATE public.client_conversion_goals
SET event_name = conversion_id
WHERE event_name IS NULL
  AND conversion_id IS NOT NULL
  AND trim(conversion_id) <> '';
