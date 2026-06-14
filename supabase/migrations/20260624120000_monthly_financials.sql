-- Monthly financials for business dashboard (CDN/US sales & expenses).

CREATE TABLE pm.monthly_financials (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  year            integer NOT NULL,
  month           integer NOT NULL CHECK (month >= 1 AND month <= 12),
  cdn_sales     numeric NOT NULL DEFAULT 0,
  cdn_expenses  numeric NOT NULL DEFAULT 0,
  usd_sales     numeric NOT NULL DEFAULT 0,
  usd_expenses  numeric NOT NULL DEFAULT 0,
  updated_by      uuid REFERENCES pm.team_members(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (year, month)
);

CREATE INDEX idx_pm_monthly_financials_year
  ON pm.monthly_financials(year);

ALTER TABLE pm.monthly_financials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "can_view_mrr can manage monthly financials"
  ON pm.monthly_financials FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM pm.team_members tm
      WHERE tm.auth_user_id = auth.uid()
        AND tm.is_active = true
        AND tm.can_view_mrr = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM pm.team_members tm
      WHERE tm.auth_user_id = auth.uid()
        AND tm.is_active = true
        AND tm.can_view_mrr = true
    )
  );

CREATE TRIGGER trg_pm_monthly_financials_updated_at
  BEFORE UPDATE ON pm.monthly_financials
  FOR EACH ROW EXECUTE FUNCTION pm.set_updated_at();
