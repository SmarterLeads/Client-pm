-- Fix team_meetings / meeting_participants RLS infinite recursion and
-- incorrect participants visibility check (meeting_id = meeting_participants.id).

CREATE OR REPLACE FUNCTION pm.can_read_meeting(p_meeting_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pm, public
AS $$
DECLARE
  m pm.team_meetings%ROWTYPE;
  v_me uuid;
BEGIN
  IF NOT pm.is_team_member() THEN
    RETURN false;
  END IF;

  v_me := pm.my_team_member_id();

  SELECT * INTO m FROM pm.team_meetings WHERE id = p_meeting_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF pm.is_admin() OR m.created_by = v_me THEN
    RETURN true;
  END IF;

  IF m.visibility = 'all'::pm.meeting_visibility THEN
    RETURN true;
  END IF;

  IF m.visibility = 'admin_only'::pm.meeting_visibility THEN
    RETURN false;
  END IF;

  IF m.visibility = 'participants'::pm.meeting_visibility THEN
    RETURN EXISTS (
      SELECT 1
      FROM pm.meeting_participants mp
      WHERE mp.meeting_id = p_meeting_id
        AND mp.team_member_id = v_me
    );
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION pm.can_manage_meeting(p_meeting_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pm, public
AS $$
  SELECT pm.is_admin()
    OR EXISTS (
      SELECT 1
      FROM pm.team_meetings m
      WHERE m.id = p_meeting_id
        AND m.created_by = pm.my_team_member_id()
    );
$$;

GRANT EXECUTE ON FUNCTION pm.can_read_meeting(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION pm.can_manage_meeting(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "team members can read visible meetings" ON pm.team_meetings;
CREATE POLICY "team members can read visible meetings"
  ON pm.team_meetings
  FOR SELECT
  TO authenticated
  USING (pm.can_read_meeting(id));

DROP POLICY IF EXISTS "team members can read participants" ON pm.meeting_participants;
CREATE POLICY "team members can read participants"
  ON pm.meeting_participants
  FOR SELECT
  TO authenticated
  USING (pm.can_read_meeting(meeting_id));

DROP POLICY IF EXISTS "creator and admins can manage participants" ON pm.meeting_participants;
CREATE POLICY "creator and admins can manage participants"
  ON pm.meeting_participants
  FOR ALL
  TO authenticated
  USING (pm.can_manage_meeting(meeting_id))
  WITH CHECK (pm.can_manage_meeting(meeting_id));
