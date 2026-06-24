-- Hide selected clients from /lead-gen (internal marketing dashboard) list.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS show_in_dashboard boolean NOT NULL DEFAULT true;

UPDATE public.clients
SET show_in_dashboard = false
WHERE name IN ('5 Towns', 'VStock', 'New York Box');
