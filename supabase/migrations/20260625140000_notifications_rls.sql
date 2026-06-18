-- Allow team members to read and mark-read their own notifications.

CREATE OR REPLACE FUNCTION pm.auth_team_member_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pm
AS $$
  SELECT tm.id
  FROM pm.team_members tm
  WHERE tm.auth_user_id = auth.uid()
     OR (
       auth.jwt() ->> 'email' IS NOT NULL
       AND lower(tm.email) = lower(auth.jwt() ->> 'email')
     )
  ORDER BY (tm.auth_user_id = auth.uid()) DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION pm.auth_team_member_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pm.auth_team_member_id() TO authenticated, service_role;

ALTER TABLE pm.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Recipients can view own notifications" ON pm.notifications;
DROP POLICY IF EXISTS "Recipients can update own notifications" ON pm.notifications;
DROP POLICY IF EXISTS "team members can manage notifications" ON pm.notifications;

CREATE POLICY "Recipients can view own notifications"
  ON pm.notifications FOR SELECT
  USING (recipient_id = pm.auth_team_member_id());

CREATE POLICY "Recipients can update own notifications"
  ON pm.notifications FOR UPDATE
  USING (recipient_id = pm.auth_team_member_id());

GRANT SELECT, UPDATE ON pm.notifications TO authenticated;
GRANT ALL ON pm.notifications TO service_role;
