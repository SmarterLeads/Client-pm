-- Update and delete pm.interactions with team member context.
-- Only the original logger or an admin may edit/delete.

CREATE OR REPLACE FUNCTION public.update_interaction_with_team_member_context(
  p_team_member_id uuid,
  p_interaction_id uuid,
  p_payload jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pm
AS $$
DECLARE
  v_logged_by uuid;
  v_role pm.team_member_role;
BEGIN
  PERFORM set_config('app.current_team_member_id', p_team_member_id::text, true);

  SELECT i.logged_by INTO v_logged_by
  FROM pm.interactions i
  WHERE i.id = p_interaction_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Interaction not found: %', p_interaction_id;
  END IF;

  SELECT tm.role INTO v_role
  FROM pm.team_members tm
  WHERE tm.id = p_team_member_id;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Team member not found: %', p_team_member_id;
  END IF;

  IF v_logged_by IS DISTINCT FROM p_team_member_id AND v_role <> 'admin' THEN
    RAISE EXCEPTION 'Not authorized to edit this interaction';
  END IF;

  UPDATE pm.interactions
  SET
    contact_id = CASE
      WHEN p_payload ? 'contact_id' THEN NULLIF(p_payload->>'contact_id', '')::uuid
      ELSE contact_id
    END,
    type = CASE
      WHEN p_payload ? 'type' THEN (p_payload->>'type')::pm.interaction_type
      ELSE type
    END,
    channel = CASE
      WHEN p_payload ? 'channel' THEN NULLIF(p_payload->>'channel', '')::pm.interaction_channel
      ELSE channel
    END,
    summary = CASE
      WHEN p_payload ? 'summary' THEN p_payload->>'summary'
      ELSE summary
    END,
    body = CASE
      WHEN p_payload ? 'body' THEN NULLIF(p_payload->>'body', '')
      ELSE body
    END,
    occurred_at = CASE
      WHEN p_payload ? 'occurred_at' THEN (p_payload->>'occurred_at')::timestamptz
      ELSE occurred_at
    END
  WHERE id = p_interaction_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_interaction_with_team_member_context(
  p_team_member_id uuid,
  p_interaction_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pm
AS $$
DECLARE
  v_logged_by uuid;
  v_role pm.team_member_role;
BEGIN
  PERFORM set_config('app.current_team_member_id', p_team_member_id::text, true);

  SELECT i.logged_by INTO v_logged_by
  FROM pm.interactions i
  WHERE i.id = p_interaction_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Interaction not found: %', p_interaction_id;
  END IF;

  SELECT tm.role INTO v_role
  FROM pm.team_members tm
  WHERE tm.id = p_team_member_id;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Team member not found: %', p_team_member_id;
  END IF;

  IF v_logged_by IS DISTINCT FROM p_team_member_id AND v_role <> 'admin' THEN
    RAISE EXCEPTION 'Not authorized to delete this interaction';
  END IF;

  DELETE FROM pm.interactions WHERE id = p_interaction_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_interaction_with_team_member_context(uuid, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_interaction_with_team_member_context(uuid, uuid, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.delete_interaction_with_team_member_context(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_interaction_with_team_member_context(uuid, uuid) TO service_role;
