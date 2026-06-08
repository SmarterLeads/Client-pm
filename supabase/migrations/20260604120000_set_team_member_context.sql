-- Sets app.current_team_member_id for the current transaction only.
-- WARNING: Calling this via PostgREST and then .insert() in a second request does NOT
-- work — use insert_*_with_team_member_context functions or one RPC per mutation.
CREATE OR REPLACE FUNCTION public.set_team_member_context(p_team_member_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.current_team_member_id', p_team_member_id::text, true);
END;
$$;

REVOKE ALL ON FUNCTION public.set_team_member_context(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_team_member_context(uuid) TO service_role;
