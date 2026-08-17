-- Per-client conversion goal configuration (PM Conversions tab).

CREATE TABLE public.client_conversion_goals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  platform text NOT NULL,
  conversion_name text NOT NULL,
  conversion_id text,
  priority text NOT NULL DEFAULT 'primary'
    CHECK (priority IN ('primary', 'secondary')),
  conversion_value numeric,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX client_conversion_goals_client_id_idx
  ON public.client_conversion_goals (client_id);

ALTER TABLE public.client_conversion_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team members can manage conversion goals"
  ON public.client_conversion_goals FOR ALL
  USING (pm.is_team_member())
  WITH CHECK (pm.is_team_member());

GRANT ALL ON public.client_conversion_goals TO authenticated, service_role;

-- Migrate existing client_conversions data
INSERT INTO public.client_conversion_goals (
  client_id,
  platform,
  conversion_name,
  conversion_id,
  priority,
  is_active,
  sort_order
)
SELECT
  client_id,
  platform,
  COALESCE(NULLIF(trim(display_name), ''), raw_name) AS conversion_name,
  raw_name AS conversion_id,
  CASE WHEN sort_order <= 2 THEN 'primary' ELSE 'secondary' END,
  is_active,
  sort_order
FROM public.client_conversions
WHERE is_active = true;
