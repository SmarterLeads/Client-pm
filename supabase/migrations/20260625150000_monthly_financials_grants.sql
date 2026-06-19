-- Grants and RLS fix for pm.monthly_financials (max@smarterleads.ca only).

ALTER TABLE pm.monthly_financials
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES pm.team_members(id) ON DELETE SET NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON pm.monthly_financials TO authenticated, service_role;

DROP POLICY IF EXISTS "only max can access monthly financials"
  ON pm.monthly_financials;

CREATE POLICY "only max can access monthly financials"
  ON pm.monthly_financials FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM pm.team_members tm
      WHERE tm.auth_user_id = auth.uid()
        AND lower(tm.email) = 'max@smarterleads.ca'
        AND tm.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM pm.team_members tm
      WHERE tm.auth_user_id = auth.uid()
        AND lower(tm.email) = 'max@smarterleads.ca'
        AND tm.is_active = true
    )
  );
