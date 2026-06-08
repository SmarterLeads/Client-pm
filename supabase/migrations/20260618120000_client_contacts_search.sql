-- Trigram search support for public.client_contacts (Contacts page).

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_client_contacts_search_trgm
  ON public.client_contacts
  USING gin (
    (
      coalesce(first_name, '') || ' ' ||
      coalesce(last_name, '') || ' ' ||
      coalesce(email, '') || ' ' ||
      coalesce(job_title, '')
    ) gin_trgm_ops
  );

CREATE OR REPLACE FUNCTION public.filter_client_contact_ids_by_search(p_query text)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT cc.id
  FROM public.client_contacts cc
  WHERE trim(coalesce(p_query, '')) = ''
     OR (coalesce(cc.first_name, '') || ' ' || coalesce(cc.last_name, '')) ILIKE '%' || trim(p_query) || '%'
     OR coalesce(cc.email, '') ILIKE '%' || trim(p_query) || '%'
     OR coalesce(cc.job_title, '') ILIKE '%' || trim(p_query) || '%'
     OR (coalesce(cc.first_name, '') || ' ' || coalesce(cc.last_name, '')) % trim(p_query)
     OR coalesce(cc.email, '') % trim(p_query)
     OR coalesce(cc.job_title, '') % trim(p_query);
$$;

GRANT EXECUTE ON FUNCTION public.filter_client_contact_ids_by_search(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.filter_client_contact_ids_by_search(text) TO service_role;
