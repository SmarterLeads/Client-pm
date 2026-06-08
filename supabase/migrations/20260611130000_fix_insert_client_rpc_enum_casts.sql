-- Remote DB uses text for clients.status and pm.rag_status (not public.client_status).

CREATE OR REPLACE FUNCTION public.insert_client_with_team_member_context(
  p_team_member_id uuid,
  p_client jsonb,
  p_contact jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pm
AS $$
DECLARE
  v_client_id uuid;
BEGIN
  PERFORM set_config('app.current_team_member_id', p_team_member_id::text, true);

  INSERT INTO public.clients (
    name,
    agency_id,
    status,
    rag_status,
    account_manager_id,
    pm_notes
  )
  VALUES (
    p_client->>'name',
    (p_client->>'agency_id')::uuid,
    COALESCE(p_client->>'status', 'prospect'),
    COALESCE((p_client->>'rag_status')::pm.rag_status, 'green'::pm.rag_status),
    NULLIF(p_client->>'account_manager_id', '')::uuid,
    NULLIF(COALESCE(p_client->>'pm_notes', p_client->>'notes'), '')
  )
  RETURNING id INTO v_client_id;

  IF p_contact IS NOT NULL AND p_contact <> '{}'::jsonb THEN
    INSERT INTO public.client_contacts (
      client_id,
      first_name,
      last_name,
      email,
      phone,
      job_title,
      is_primary,
      pm_notes
    )
    VALUES (
      v_client_id,
      p_contact->>'first_name',
      NULLIF(p_contact->>'last_name', ''),
      COALESCE(NULLIF(p_contact->>'email', ''), ''),
      NULLIF(p_contact->>'phone', ''),
      NULLIF(p_contact->>'job_title', ''),
      COALESCE((p_contact->>'is_primary')::boolean, true),
      NULLIF(COALESCE(p_contact->>'pm_notes', p_contact->>'notes'), '')
    );
  END IF;

  RETURN v_client_id;
END;
$$;

REVOKE ALL ON FUNCTION public.insert_client_with_team_member_context(uuid, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_client_with_team_member_context(uuid, jsonb, jsonb) TO service_role;
