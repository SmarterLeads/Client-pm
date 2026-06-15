-- Client hourly billing fields and RPC support.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS is_hourly boolean NOT NULL DEFAULT false;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS hourly_rate numeric(10, 2) NOT NULL DEFAULT 0;

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
    gmb_url = COALESCE(NULLIF(p_payload->>'gmb_url', ''), gmb_url),
    business_phone = COALESCE(NULLIF(p_payload->>'business_phone', ''), business_phone),
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
    currency = COALESCE(NULLIF(p_payload->>'currency', ''), currency),
    ga4_id = COALESCE(NULLIF(p_payload->>'ga4_id', ''), ga4_id),
    marketing_brief = COALESCE(NULLIF(p_payload->>'marketing_brief', ''), marketing_brief),
    is_hourly = CASE
      WHEN p_payload ? 'is_hourly' THEN COALESCE((p_payload->>'is_hourly')::boolean, false)
      ELSE is_hourly
    END,
    hourly_rate = CASE
      WHEN p_payload ? 'hourly_rate' THEN COALESCE(NULLIF(p_payload->>'hourly_rate', '')::numeric, 0)
      ELSE hourly_rate
    END,
    updated_at = now()
  WHERE id = p_client_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client not found: %', p_client_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_client_billable_hours_this_month(p_client_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pm
AS $$
  SELECT COALESCE(SUM(te.duration_minutes), 0)::numeric / 60.0
  FROM pm.time_entries te
  INNER JOIN pm.tasks t ON t.id = te.task_id
  INNER JOIN pm.projects p ON p.id = t.project_id
  WHERE p.client_id = p_client_id
    AND te.billable = true
    AND date_trunc('month', te.logged_date::timestamp) = date_trunc('month', CURRENT_DATE);
$$;

CREATE OR REPLACE FUNCTION public.get_hourly_billing_this_month()
RETURNS TABLE (
  client_id uuid,
  client_name text,
  agency_name text,
  hourly_rate numeric,
  currency text,
  hours numeric,
  amount_due numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pm
AS $$
  SELECT
    c.id AS client_id,
    c.name AS client_name,
    a.name AS agency_name,
    c.hourly_rate,
    c.currency,
    COALESCE(SUM(te.duration_minutes), 0)::numeric / 60.0 AS hours,
    COALESCE(SUM(te.duration_minutes), 0)::numeric / 60.0 * c.hourly_rate AS amount_due
  FROM public.clients c
  LEFT JOIN public.agencies a ON a.id = c.agency_id
  LEFT JOIN pm.projects p ON p.client_id = c.id
  LEFT JOIN pm.tasks t ON t.project_id = p.id
  LEFT JOIN pm.time_entries te ON te.task_id = t.id
    AND te.billable = true
    AND date_trunc('month', te.logged_date::timestamp) = date_trunc('month', CURRENT_DATE)
  WHERE c.is_hourly = true
  GROUP BY c.id, c.name, c.hourly_rate, c.currency, a.name
  ORDER BY amount_due DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_billable_hours_this_month(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_billable_hours_this_month(uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.get_hourly_billing_this_month() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_hourly_billing_this_month() TO service_role;

REVOKE ALL ON FUNCTION public.update_client_with_team_member_context(uuid, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_client_with_team_member_context(uuid, uuid, jsonb) TO service_role;
