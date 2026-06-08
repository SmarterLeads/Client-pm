-- Client overview custom fields (migration 004) + RPC support.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS legal_name text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS hst_number text,
  ADD COLUMN IF NOT EXISTS address_street text,
  ADD COLUMN IF NOT EXISTS address_city text,
  ADD COLUMN IF NOT EXISTS address_province text,
  ADD COLUMN IF NOT EXISTS address_postal_code text,
  ADD COLUMN IF NOT EXISTS address_country text DEFAULT 'Canada',
  ADD COLUMN IF NOT EXISTS marketing_channels text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tracking_setup text,
  ADD COLUMN IF NOT EXISTS ga4_id text,
  ADD COLUMN IF NOT EXISTS mrr_cents integer;

ALTER TABLE pm.team_members
  ADD COLUMN IF NOT EXISTS can_view_mrr boolean NOT NULL DEFAULT false;

UPDATE pm.team_members
SET can_view_mrr = true
WHERE role = 'admin'::pm.team_member_role;

CREATE UNIQUE INDEX IF NOT EXISTS platform_connections_client_platform_uidx
  ON public.platform_connections (client_id, platform);

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
    legal_name = CASE
      WHEN p_payload ? 'legal_name' THEN NULLIF(p_payload->>'legal_name', '')
      ELSE legal_name
    END,
    website_url = CASE
      WHEN p_payload ? 'website_url' THEN NULLIF(p_payload->>'website_url', '')
      ELSE website_url
    END,
    industry = CASE
      WHEN p_payload ? 'industry' THEN NULLIF(p_payload->>'industry', '')
      ELSE industry
    END,
    client_type = CASE
      WHEN p_payload ? 'client_type' THEN NULLIF(p_payload->>'client_type', '')
      ELSE client_type
    END,
    hst_number = CASE
      WHEN p_payload ? 'hst_number' THEN NULLIF(p_payload->>'hst_number', '')
      ELSE hst_number
    END,
    address_street = CASE
      WHEN p_payload ? 'address_street' THEN NULLIF(p_payload->>'address_street', '')
      ELSE address_street
    END,
    address_city = CASE
      WHEN p_payload ? 'address_city' THEN NULLIF(p_payload->>'address_city', '')
      ELSE address_city
    END,
    address_province = CASE
      WHEN p_payload ? 'address_province' THEN NULLIF(p_payload->>'address_province', '')
      ELSE address_province
    END,
    address_postal_code = CASE
      WHEN p_payload ? 'address_postal_code' THEN NULLIF(p_payload->>'address_postal_code', '')
      ELSE address_postal_code
    END,
    address_country = CASE
      WHEN p_payload ? 'address_country' THEN NULLIF(p_payload->>'address_country', '')
      ELSE address_country
    END,
    marketing_channels = CASE
      WHEN p_payload ? 'marketing_channels' THEN
        COALESCE(
          ARRAY(
            SELECT jsonb_array_elements_text(p_payload->'marketing_channels')
          ),
          '{}'::text[]
        )
      ELSE marketing_channels
    END,
    tracking_setup = CASE
      WHEN p_payload ? 'tracking_setup' THEN NULLIF(p_payload->>'tracking_setup', '')
      ELSE tracking_setup
    END,
    ga4_id = CASE
      WHEN p_payload ? 'ga4_id' THEN NULLIF(p_payload->>'ga4_id', '')
      ELSE ga4_id
    END,
    mrr_cents = CASE
      WHEN p_payload ? 'mrr_cents' THEN NULLIF(p_payload->>'mrr_cents', '')::integer
      ELSE mrr_cents
    END,
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

CREATE OR REPLACE FUNCTION public.upsert_platform_connection(
  p_team_member_id uuid,
  p_client_id uuid,
  p_platform text,
  p_external_account_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pm
AS $$
BEGIN
  PERFORM set_config('app.current_team_member_id', p_team_member_id::text, true);

  IF NULLIF(trim(p_external_account_id), '') IS NULL THEN
    DELETE FROM public.platform_connections
    WHERE client_id = p_client_id
      AND platform = p_platform;
    RETURN;
  END IF;

  INSERT INTO public.platform_connections (
    client_id,
    platform,
    external_account_id,
    status
  )
  VALUES (
    p_client_id,
    p_platform,
    trim(p_external_account_id),
    'active'
  )
  ON CONFLICT (client_id, platform) DO UPDATE
  SET
    external_account_id = EXCLUDED.external_account_id,
    status = 'active',
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.update_client_with_team_member_context(uuid, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_client_with_team_member_context(uuid, uuid, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.upsert_platform_connection(uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_platform_connection(uuid, uuid, text, text) TO service_role;
