CREATE OR REPLACE FUNCTION public.update_team_member_availability_with_team_member_context(
  p_team_member_id uuid,
  p_target_member_id uuid,
  p_is_available boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pm
AS $$
BEGIN
  PERFORM set_config('app.current_team_member_id', p_team_member_id::text, true);

  UPDATE pm.team_members
  SET is_available = p_is_available
  WHERE id = p_target_member_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_team_member_availability_with_team_member_context(uuid, uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_team_member_availability_with_team_member_context(uuid, uuid, boolean) TO service_role;
