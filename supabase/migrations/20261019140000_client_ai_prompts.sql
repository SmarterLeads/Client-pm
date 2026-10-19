CREATE TABLE pm.client_ai_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients (id) ON DELETE CASCADE,
  name text NOT NULL,
  platform text NOT NULL DEFAULT 'google_ads',
  prompt_text text NOT NULL DEFAULT '',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX client_ai_prompts_client_id_idx
  ON pm.client_ai_prompts (client_id, platform, updated_at DESC);

CREATE UNIQUE INDEX client_ai_prompts_one_default_per_client_platform
  ON pm.client_ai_prompts (client_id, platform)
  WHERE is_default = true;

ALTER TABLE pm.client_ai_prompts ENABLE ROW LEVEL SECURITY;
GRANT ALL ON pm.client_ai_prompts TO service_role;
