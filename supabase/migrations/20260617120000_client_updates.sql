-- Client marketing updates log (PM client detail Updates tab).

CREATE TABLE pm.client_updates (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id         uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  logged_by         uuid REFERENCES pm.team_members(id) ON DELETE SET NULL,
  marketing_channel text NOT NULL,
  summary           text NOT NULL,
  occurred_at       timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pm_client_updates_client ON pm.client_updates(client_id);
CREATE INDEX idx_pm_client_updates_logged_by ON pm.client_updates(logged_by);
CREATE INDEX idx_pm_client_updates_occurred_at ON pm.client_updates(occurred_at DESC);
CREATE INDEX idx_pm_client_updates_channel ON pm.client_updates(marketing_channel);

ALTER TABLE pm.client_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team members can manage client updates"
  ON pm.client_updates FOR ALL USING (pm.is_team_member());

CREATE TRIGGER trg_pm_client_updates_updated_at
  BEFORE UPDATE ON pm.client_updates
  FOR EACH ROW EXECUTE FUNCTION pm.set_updated_at();
