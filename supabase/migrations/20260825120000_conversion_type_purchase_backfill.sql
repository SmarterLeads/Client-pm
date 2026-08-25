-- Classify purchase conversions for ecommerce hero metrics (Purchases / Purchase Value).

ALTER TABLE public.client_conversions
  ADD COLUMN IF NOT EXISTS conversion_type text;

ALTER TABLE public.client_conversions
  ALTER COLUMN conversion_type SET DEFAULT 'other';

UPDATE public.client_conversions
SET conversion_type = COALESCE(NULLIF(trim(conversion_type), ''), 'other')
WHERE conversion_type IS NULL;

UPDATE public.client_conversions
SET conversion_type = 'purchase'
WHERE display_name ILIKE '%purchase%'
   OR raw_name IN ('purchase', 'Hudson Table - GA4 (web) purchase');

ALTER TABLE public.client_conversion_goals
  ADD COLUMN IF NOT EXISTS conversion_type text;

ALTER TABLE public.client_conversion_goals
  ALTER COLUMN conversion_type SET DEFAULT 'other';

UPDATE public.client_conversion_goals
SET conversion_type = COALESCE(NULLIF(trim(conversion_type), ''), 'other')
WHERE conversion_type IS NULL;

UPDATE public.client_conversion_goals
SET conversion_type = 'purchase'
WHERE conversion_name ILIKE '%purchase%'
   OR conversion_id IN ('purchase', 'Hudson Table - GA4 (web) purchase');

UPDATE public.client_conversions cc
SET conversion_type = g.conversion_type
FROM public.client_conversion_goals g
WHERE cc.client_id = g.client_id
  AND cc.platform = g.platform
  AND (
    (g.conversion_id IS NOT NULL AND trim(g.conversion_id) <> '' AND cc.raw_name = g.conversion_id)
    OR lower(trim(COALESCE(cc.display_name, cc.raw_name))) = lower(trim(g.conversion_name))
  )
  AND g.is_active = true
  AND g.conversion_type IS NOT NULL
  AND trim(g.conversion_type) <> '';
