-- Update pm.projects with team member context (inline header edits).

CREATE OR REPLACE FUNCTION public.update_project_with_team_member_context(
  p_team_member_id uuid,
  p_project_id uuid,
  p_payload jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pm
AS $$
BEGIN
  PERFORM set_config('app.current_team_member_id', p_team_member_id::text, true);

  UPDATE pm.projects
  SET
    name = CASE WHEN p_payload ? 'name' THEN p_payload->>'name' ELSE name END,
    description = CASE WHEN p_payload ? 'description' THEN NULLIF(p_payload->>'description', '') ELSE description END,
    owner_id = CASE WHEN p_payload ? 'owner_id' THEN NULLIF(p_payload->>'owner_id', '')::uuid ELSE owner_id END,
    status = CASE WHEN p_payload ? 'status' THEN (p_payload->>'status')::pm.project_status ELSE status END,
    rag_status = CASE WHEN p_payload ? 'rag_status' THEN (p_payload->>'rag_status')::pm.rag_status ELSE rag_status END,
    start_date = CASE WHEN p_payload ? 'start_date' THEN NULLIF(p_payload->>'start_date', '')::date ELSE start_date END,
    due_date = CASE WHEN p_payload ? 'due_date' THEN NULLIF(p_payload->>'due_date', '')::date ELSE due_date END,
    updated_at = now()
  WHERE id = p_project_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_project_with_team_member_context(uuid, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_project_with_team_member_context(uuid, uuid, jsonb) TO service_role;
