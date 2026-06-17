-- Multiple contacts and additional attendees on interactions.

ALTER TABLE pm.interactions
  ADD COLUMN IF NOT EXISTS contact_ids uuid[] NOT NULL DEFAULT '{}';

UPDATE pm.interactions
SET contact_ids = ARRAY[contact_id]
WHERE contact_id IS NOT NULL
  AND contact_ids = '{}';

CREATE TABLE pm.interaction_attendees (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  interaction_id uuid NOT NULL REFERENCES pm.interactions(id)
                   ON DELETE CASCADE,
  name           text NOT NULL,
  email          text,
  company        text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pm_interaction_attendees
  ON pm.interaction_attendees(interaction_id);

ALTER TABLE pm.interaction_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team members can manage attendees"
  ON pm.interaction_attendees FOR ALL
  USING (pm.is_team_member());

GRANT ALL ON pm.interaction_attendees TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.insert_interaction_with_team_member_context(
  p_team_member_id uuid,
  p_payload jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pm
AS $$
DECLARE
  v_id uuid;
  v_contact_ids uuid[];
BEGIN
  PERFORM set_config('app.current_team_member_id', p_team_member_id::text, true);

  IF p_payload ? 'contact_ids' AND jsonb_typeof(p_payload->'contact_ids') = 'array' THEN
    SELECT COALESCE(array_agg(elem::uuid), '{}')
    INTO v_contact_ids
    FROM jsonb_array_elements_text(p_payload->'contact_ids') AS elem
    WHERE elem <> '';
  ELSE
    v_contact_ids := '{}';
  END IF;

  INSERT INTO pm.interactions (
    client_id,
    contact_id,
    contact_ids,
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
    v_contact_ids,
    (p_payload->>'type')::pm.interaction_type,
    NULLIF(p_payload->>'channel', '')::pm.interaction_channel,
    p_payload->>'summary',
    NULLIF(p_payload->>'body', ''),
    COALESCE((p_payload->>'occurred_at')::timestamptz, now()),
    p_team_member_id
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_interaction_with_team_member_context(
  p_team_member_id uuid,
  p_interaction_id uuid,
  p_payload jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pm
AS $$
DECLARE
  v_logged_by uuid;
  v_role pm.team_member_role;
  v_contact_ids uuid[];
BEGIN
  PERFORM set_config('app.current_team_member_id', p_team_member_id::text, true);

  SELECT i.logged_by INTO v_logged_by
  FROM pm.interactions i
  WHERE i.id = p_interaction_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Interaction not found: %', p_interaction_id;
  END IF;

  SELECT tm.role INTO v_role
  FROM pm.team_members tm
  WHERE tm.id = p_team_member_id;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Team member not found: %', p_team_member_id;
  END IF;

  IF v_logged_by IS DISTINCT FROM p_team_member_id AND v_role <> 'admin' THEN
    RAISE EXCEPTION 'Not authorized to edit this interaction';
  END IF;

  IF p_payload ? 'contact_ids' AND jsonb_typeof(p_payload->'contact_ids') = 'array' THEN
    SELECT COALESCE(array_agg(elem::uuid), '{}')
    INTO v_contact_ids
    FROM jsonb_array_elements_text(p_payload->'contact_ids') AS elem
    WHERE elem <> '';
  END IF;

  UPDATE pm.interactions
  SET
    contact_id = CASE
      WHEN p_payload ? 'contact_id' THEN NULLIF(p_payload->>'contact_id', '')::uuid
      ELSE contact_id
    END,
    contact_ids = CASE
      WHEN p_payload ? 'contact_ids' THEN v_contact_ids
      ELSE contact_ids
    END,
    type = CASE
      WHEN p_payload ? 'type' THEN (p_payload->>'type')::pm.interaction_type
      ELSE type
    END,
    channel = CASE
      WHEN p_payload ? 'channel' THEN NULLIF(p_payload->>'channel', '')::pm.interaction_channel
      ELSE channel
    END,
    summary = CASE
      WHEN p_payload ? 'summary' THEN p_payload->>'summary'
      ELSE summary
    END,
    body = CASE
      WHEN p_payload ? 'body' THEN NULLIF(p_payload->>'body', '')
      ELSE body
    END,
    occurred_at = CASE
      WHEN p_payload ? 'occurred_at' THEN (p_payload->>'occurred_at')::timestamptz
      ELSE occurred_at
    END
  WHERE id = p_interaction_id;
END;
$$;

REVOKE ALL ON FUNCTION public.insert_interaction_with_team_member_context(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_interaction_with_team_member_context(uuid, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.update_interaction_with_team_member_context(uuid, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_interaction_with_team_member_context(uuid, uuid, jsonb) TO service_role;
