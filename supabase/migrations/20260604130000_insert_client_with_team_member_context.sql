-- SET LOCAL only applies within the current transaction. PostgREST uses a new
-- transaction per HTTP request, so context + insert must live in one function.

CREATE OR REPLACE FUNCTION public.insert_client_with_team_member_context(
  p_team_member_id uuid,
  p_payload jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  PERFORM set_config('app.current_team_member_id', p_team_member_id::text, true);

  INSERT INTO public.clients (
    name,
    email,
    phone,
    company,
    status,
    rag_status,
    account_manager_id,
    notes
  )
  VALUES (
    p_payload->>'name',
    NULLIF(p_payload->>'email', ''),
    NULLIF(p_payload->>'phone', ''),
    NULLIF(p_payload->>'company', ''),
    (p_payload->>'status')::public.client_status,
    (p_payload->>'rag_status')::public.rag_status,
    NULLIF(p_payload->>'account_manager_id', '')::uuid,
    NULLIF(p_payload->>'notes', '')
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.insert_client_with_team_member_context(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_client_with_team_member_context(uuid, jsonb) TO service_role;
