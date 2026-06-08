-- Marketing brief text on client records (PM client detail tab).

ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS marketing_brief text;

CREATE OR REPLACE FUNCTION public.update_client_with_team_member_context(
  p_client_id uuid,
  p_team_member_id uuid,
  p_payload jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pm
AS $$
BEGIN
  PERFORM set_config('app.current_team_member_id', p_team_member_id::text, true);

  UPDATE public.clients
  SET
    name = CASE WHEN p_payload ? 'name' THEN p_payload->>'name' ELSE name END,
    status = CASE
      WHEN p_payload ? 'status' THEN p_payload->>'status'
      ELSE status
    END,
    rag_status = CASE
      WHEN p_payload ? 'rag_status' THEN (p_payload->>'rag_status')::pm.rag_status
      ELSE rag_status
    END,
    account_manager_id = CASE
      WHEN p_payload ? 'account_manager_id' THEN NULLIF(p_payload->>'account_manager_id', '')::uuid
      ELSE account_manager_id
    END,
    pm_notes = CASE
      WHEN p_payload ? 'pm_notes' THEN NULLIF(p_payload->>'pm_notes', '')
      WHEN p_payload ? 'notes' THEN NULLIF(p_payload->>'notes', '')
      ELSE pm_notes
    END,
    marketing_brief = CASE
      WHEN p_payload ? 'marketing_brief' THEN NULLIF(p_payload->>'marketing_brief', '')
      ELSE marketing_brief
    END,
    updated_at = now()
  WHERE id = p_client_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client not found: %', p_client_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.update_client_with_team_member_context(uuid, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_client_with_team_member_context(uuid, uuid, jsonb) TO service_role;
