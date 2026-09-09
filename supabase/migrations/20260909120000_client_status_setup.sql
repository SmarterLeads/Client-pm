-- Add "setup" client lifecycle status (onboarding, excluded from MRR metrics).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'client_status'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'client_status'
      AND e.enumlabel = 'setup'
  ) THEN
    ALTER TYPE public.client_status ADD VALUE 'setup';
  END IF;
END $$;

DO $$
DECLARE
  constraint_name text;
  schema_name text;
  table_name text;
BEGIN
  FOR schema_name, table_name IN
    SELECT * FROM (VALUES ('public', 'clients'), ('pm', 'clients')) AS t(s, n)
  LOOP
    IF to_regclass(format('%I.%I', schema_name, table_name)) IS NULL THEN
      CONTINUE;
    END IF;

    SELECT c.conname
    INTO constraint_name
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = rel.relnamespace
    WHERE n.nspname = schema_name
      AND rel.relname = table_name
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%status%'
    LIMIT 1;

    IF constraint_name IS NOT NULL THEN
      EXECUTE format(
        'ALTER TABLE %I.%I DROP CONSTRAINT %I',
        schema_name,
        table_name,
        constraint_name
      );
      EXECUTE format(
        'ALTER TABLE %I.%I ADD CONSTRAINT %I CHECK (status IN (''active'', ''setup'', ''inactive'', ''prospect'', ''on_hold'', ''churned''))',
        schema_name,
        table_name,
        table_name || '_status_check'
      );
    END IF;
  END LOOP;
END $$;

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
    AND c.status = 'active'
  GROUP BY c.id, c.name, c.hourly_rate, c.currency, a.name
  ORDER BY amount_due DESC;
$$;
