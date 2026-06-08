-- Per-channel MRR breakdown on public.clients (amounts in cents).

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS mrr_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb;

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
    name = COALESCE(p_payload->>'name', name),
    status = COALESCE(p_payload->>'status', status),
    rag_status = COALESCE((p_payload->>'rag_status')::pm.rag_status, rag_status),
    account_manager_id = CASE
      WHEN p_payload ? 'account_manager_id' THEN NULLIF(p_payload->>'account_manager_id', '')::uuid
      ELSE account_manager_id
    END,
    pm_notes = COALESCE(
      NULLIF(COALESCE(p_payload->>'pm_notes', p_payload->>'notes'), ''),
      pm_notes
    ),
    legal_name = COALESCE(NULLIF(p_payload->>'legal_name', ''), legal_name),
    address_street = COALESCE(NULLIF(p_payload->>'address_street', ''), address_street),
    address_city = COALESCE(NULLIF(p_payload->>'address_city', ''), address_city),
    address_province = COALESCE(NULLIF(p_payload->>'address_province', ''), address_province),
    address_postal_code = COALESCE(
      NULLIF(COALESCE(p_payload->>'address_postal_code', p_payload->>'address_postal'), ''),
      address_postal_code
    ),
    address_country = COALESCE(NULLIF(p_payload->>'address_country', ''), address_country),
    hst_number = COALESCE(NULLIF(p_payload->>'hst_number', ''), hst_number),
    website_url = COALESCE(NULLIF(p_payload->>'website_url', ''), website_url),
    industry = COALESCE(NULLIF(p_payload->>'industry', ''), industry),
    client_type = COALESCE(NULLIF(p_payload->>'client_type', ''), client_type),
    marketing_channels = CASE
      WHEN p_payload ? 'marketing_channels' THEN COALESCE(
        (
          SELECT array_agg(v)
          FROM jsonb_array_elements_text(p_payload->'marketing_channels') AS t(v)
        ),
        '{}'::text[]
      )
      ELSE marketing_channels
    END,
    tracking_setup = COALESCE(NULLIF(p_payload->>'tracking_setup', ''), tracking_setup),
    mrr_cents = CASE
      WHEN p_payload ? 'mrr_cents' THEN NULLIF(p_payload->>'mrr_cents', '')::bigint
      ELSE mrr_cents
    END,
    mrr_breakdown = CASE
      WHEN p_payload ? 'mrr_breakdown' THEN COALESCE(p_payload->'mrr_breakdown', '{}'::jsonb)
      ELSE mrr_breakdown
    END,
    ga4_id = COALESCE(NULLIF(p_payload->>'ga4_id', ''), ga4_id),
    marketing_brief = COALESCE(NULLIF(p_payload->>'marketing_brief', ''), marketing_brief),
    updated_at = now()
  WHERE id = p_client_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client not found: %', p_client_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.update_client_with_team_member_context(uuid, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_client_with_team_member_context(uuid, uuid, jsonb) TO service_role;
