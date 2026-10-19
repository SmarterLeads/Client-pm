-- Google Ads customer id on clients (optional; used in AI account context)
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS google_ads_customer_id text;

COMMENT ON COLUMN public.clients.google_ads_customer_id IS
  'Google Ads customer ID (e.g. 123-456-7890) for reporting and AI insights';

CREATE TABLE pm.ai_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  platform text NOT NULL,
  prompt_text text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ai_prompts_platform_idx ON pm.ai_prompts (platform);
CREATE UNIQUE INDEX ai_prompts_one_default_per_platform
  ON pm.ai_prompts (platform)
  WHERE is_default = true;

CREATE TABLE pm.client_ai_weekly_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients (id) ON DELETE CASCADE,
  prompt_id uuid REFERENCES pm.ai_prompts (id) ON DELETE SET NULL,
  week_start date NOT NULL,
  week_end date NOT NULL,
  status text NOT NULL CHECK (status IN ('generating', 'completed', 'failed')),
  report_markdown text,
  error_message text,
  triggered_by uuid REFERENCES pm.team_members (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX client_ai_weekly_insights_client_id_idx
  ON pm.client_ai_weekly_insights (client_id, created_at DESC);

ALTER TABLE pm.ai_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm.client_ai_weekly_insights ENABLE ROW LEVEL SECURITY;

GRANT ALL ON pm.ai_prompts TO service_role;
GRANT ALL ON pm.client_ai_weekly_insights TO service_role;
