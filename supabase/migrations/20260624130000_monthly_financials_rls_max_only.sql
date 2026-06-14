-- Restrict monthly financials to max@smarterleads.ca only.

DROP POLICY IF EXISTS "can_view_mrr can manage monthly financials"
  ON pm.monthly_financials;

DROP POLICY IF EXISTS "admins can manage monthly financials"
  ON pm.monthly_financials;

CREATE POLICY "only max can access monthly financials"
  ON pm.monthly_financials FOR ALL
  USING (
    auth.uid() = (
      SELECT auth_user_id
      FROM pm.team_members
      WHERE email = 'max@smarterleads.ca'
      LIMIT 1
    )
  )
  WITH CHECK (
    auth.uid() = (
      SELECT auth_user_id
      FROM pm.team_members
      WHERE email = 'max@smarterleads.ca'
      LIMIT 1
    )
  );
