-- Client platform credentials (Access tab on client detail).

CREATE TABLE pm.client_credentials (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id    uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  platform     text NOT NULL,
  url          text,
  username     text,
  password     text,
  notes        text,
  created_by   uuid REFERENCES pm.team_members(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pm_client_credentials_client
  ON pm.client_credentials(client_id);

ALTER TABLE pm.client_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins and account managers can manage credentials"
  ON pm.client_credentials FOR ALL
  USING (
    pm.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_id
      AND c.account_manager_id = pm.my_team_member_id()
    )
  )
  WITH CHECK (
    pm.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_id
      AND c.account_manager_id = pm.my_team_member_id()
    )
  );

CREATE TRIGGER trg_pm_client_credentials_updated_at
  BEFORE UPDATE ON pm.client_credentials
  FOR EACH ROW EXECUTE FUNCTION pm.set_updated_at();
