-- clients table no longer has email, phone, or company (moved to client_contacts).
-- Fix update RPC so inline field edits (status, RAG, account manager) succeed.

CREATE OR REPLACE FUNCTION public.update_client_with_team_member_context(
  p_team_member_id uuid,
  p_client_id uuid,
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
    notes = CASE
      WHEN p_payload ? 'notes' THEN NULLIF(p_payload->>'notes', '')
      ELSE notes
    END,
    updated_at = now()
  WHERE id = p_client_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client not found: %', p_client_id;
  END IF;
END;
$$;
