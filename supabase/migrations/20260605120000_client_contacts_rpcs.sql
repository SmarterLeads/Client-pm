-- Client + primary contact in one transaction (replaces legacy insert with email/phone on clients).

CREATE OR REPLACE FUNCTION public.insert_client_with_team_member_context(
  p_team_member_id uuid,
  p_client jsonb,
  p_contact jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
BEGIN
  PERFORM set_config('app.current_team_member_id', p_team_member_id::text, true);

  INSERT INTO public.clients (
    name,
    status,
    rag_status,
    account_manager_id,
    notes
  )
  VALUES (
    p_client->>'name',
    (p_client->>'status')::public.client_status,
    (p_client->>'rag_status')::public.rag_status,
    NULLIF(p_client->>'account_manager_id', '')::uuid,
    NULLIF(p_client->>'notes', '')
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
      notes
    )
    VALUES (
      v_client_id,
      p_contact->>'first_name',
      NULLIF(p_contact->>'last_name', ''),
      NULLIF(p_contact->>'email', ''),
      NULLIF(p_contact->>'phone', ''),
      NULLIF(p_contact->>'job_title', ''),
      COALESCE((p_contact->>'is_primary')::boolean, true),
      NULLIF(p_contact->>'notes', '')
    );
  END IF;

  RETURN v_client_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.insert_client_contact_with_team_member_context(
  p_team_member_id uuid,
  p_contact jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_is_primary boolean;
BEGIN
  PERFORM set_config('app.current_team_member_id', p_team_member_id::text, true);

  v_is_primary := COALESCE((p_contact->>'is_primary')::boolean, false);

  IF v_is_primary THEN
    UPDATE public.client_contacts
    SET is_primary = false
    WHERE client_id = (p_contact->>'client_id')::uuid
      AND is_primary = true;
  END IF;

  INSERT INTO public.client_contacts (
    client_id,
    first_name,
    last_name,
    email,
    phone,
    job_title,
    is_primary,
    notes
  )
  VALUES (
    (p_contact->>'client_id')::uuid,
    p_contact->>'first_name',
    NULLIF(p_contact->>'last_name', ''),
    NULLIF(p_contact->>'email', ''),
    NULLIF(p_contact->>'phone', ''),
    NULLIF(p_contact->>'job_title', ''),
    v_is_primary,
    NULLIF(p_contact->>'notes', '')
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_client_contact_with_team_member_context(
  p_team_member_id uuid,
  p_contact_id uuid,
  p_payload jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_set_primary boolean;
BEGIN
  PERFORM set_config('app.current_team_member_id', p_team_member_id::text, true);

  SELECT client_id INTO v_client_id
  FROM public.client_contacts
  WHERE id = p_contact_id;

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Contact not found: %', p_contact_id;
  END IF;

  v_set_primary := COALESCE((p_payload->>'is_primary')::boolean, false);

  IF v_set_primary AND (p_payload ? 'is_primary') THEN
    UPDATE public.client_contacts
    SET is_primary = false
    WHERE client_id = v_client_id
      AND id <> p_contact_id
      AND is_primary = true;
  END IF;

  UPDATE public.client_contacts
  SET
    first_name = CASE WHEN p_payload ? 'first_name' THEN p_payload->>'first_name' ELSE first_name END,
    last_name = CASE WHEN p_payload ? 'last_name' THEN NULLIF(p_payload->>'last_name', '') ELSE last_name END,
    email = CASE WHEN p_payload ? 'email' THEN NULLIF(p_payload->>'email', '') ELSE email END,
    phone = CASE WHEN p_payload ? 'phone' THEN NULLIF(p_payload->>'phone', '') ELSE phone END,
    job_title = CASE WHEN p_payload ? 'job_title' THEN NULLIF(p_payload->>'job_title', '') ELSE job_title END,
    is_primary = CASE WHEN p_payload ? 'is_primary' THEN v_set_primary ELSE is_primary END,
    notes = CASE WHEN p_payload ? 'notes' THEN NULLIF(p_payload->>'notes', '') ELSE notes END,
    updated_at = now()
  WHERE id = p_contact_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.insert_interaction_with_team_member_context(
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

  INSERT INTO public.interactions (
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
    (p_payload->>'type')::public.interaction_type,
    NULLIF(p_payload->>'channel', '')::public.interaction_channel,
    p_payload->>'summary',
    NULLIF(p_payload->>'body', ''),
    COALESCE((p_payload->>'occurred_at')::timestamptz, now()),
    p_team_member_id
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.insert_client_with_team_member_context(uuid, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_client_with_team_member_context(uuid, jsonb, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.insert_client_contact_with_team_member_context(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_client_contact_with_team_member_context(uuid, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.update_client_contact_with_team_member_context(uuid, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_client_contact_with_team_member_context(uuid, uuid, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.insert_interaction_with_team_member_context(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_interaction_with_team_member_context(uuid, jsonb) TO service_role;
