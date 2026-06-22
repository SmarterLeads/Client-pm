-- Inbound email logging and team member email aliases.

CREATE TABLE pm.team_member_emails (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_member_id uuid NOT NULL REFERENCES pm.team_members(id)
    ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE pm.email_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_email text NOT NULL,
  to_email text,
  cc_email text,
  subject text,
  body_text text,
  body_html text,
  received_at timestamptz NOT NULL DEFAULT now(),
  team_member_id uuid REFERENCES pm.team_members(id),
  matched_client_id uuid REFERENCES public.clients(id),
  interaction_id uuid REFERENCES pm.interactions(id),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('matched', 'pending', 'ignored')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pm_email_log_status ON pm.email_log(status);
CREATE INDEX idx_pm_email_log_team_member ON pm.email_log(team_member_id);
CREATE INDEX idx_pm_email_log_received_at ON pm.email_log(received_at DESC);

ALTER TABLE pm.team_member_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm.email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team members can read team_member_emails"
  ON pm.team_member_emails FOR SELECT
  USING (pm.is_team_member());

CREATE POLICY "team members can manage email_log"
  ON pm.email_log FOR ALL
  USING (pm.is_team_member());

GRANT ALL ON pm.team_member_emails TO authenticated, service_role;
GRANT ALL ON pm.email_log TO authenticated, service_role;

INSERT INTO pm.team_member_emails (team_member_id, email)
SELECT tm.id, lower(alias.email)
FROM pm.team_members tm
CROSS JOIN unnest(ARRAY[
  'max@smarterleads.ca',
  'max@zevmedia.com',
  'max@napkin-marketing.com',
  'max@blueflamingo.solutions'
]::text[]) AS alias(email)
WHERE lower(tm.email) = 'max@smarterleads.ca'
ON CONFLICT (email) DO NOTHING;

INSERT INTO pm.team_member_emails (team_member_id, email)
SELECT tm.id, lower(alias.email)
FROM pm.team_members tm
CROSS JOIN unnest(ARRAY[
  'alex@smarterleads.ca',
  'marketing@zevmedia.com',
  'alex@blueflamingo.solutions',
  'alex@napkin-marketing.com'
]::text[]) AS alias(email)
WHERE lower(tm.email) = 'alex@smarterleads.ca'
ON CONFLICT (email) DO NOTHING;
