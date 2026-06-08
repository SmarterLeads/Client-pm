-- interactions table lives in pm schema, not public.
-- Replaces insert_interaction_with_team_member_context without re-running 20260605120000.

CREATE OR REPLACE FUNCTION public.insert_interaction_with_team_member_context(
  p_team_member_id uuid,
  p_payload jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pm
AS $$
DECLARE
  v_id uuid;
BEGIN
  PERFORM set_config('app.current_team_member_id', p_team_member_id::text, true);

  INSERT INTO pm.interactions (
    client_id,
    contact_id,
    type,
    channel,
    summary,
    body,
    occurred_at,
    logged_by
  )
  VALUES (
    (p_payload->>'client_id')::uuid,
    NULLIF(p_payload->>'contact_id', '')::uuid,
    (p_payload->>'type')::pm.interaction_type,
    NULLIF(p_payload->>'channel', '')::pm.interaction_channel,
    p_payload->>'summary',
    NULLIF(p_payload->>'body', ''),
    COALESCE((p_payload->>'occurred_at')::timestamptz, now()),
    p_team_member_id
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.insert_interaction_with_team_member_context(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_interaction_with_team_member_context(uuid, jsonb) TO service_role;
