-- Opt-in task review workflow.

ALTER TABLE pm.tasks
  ADD COLUMN IF NOT EXISTS requires_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS review_requested_by uuid REFERENCES pm.team_members(id);

CREATE OR REPLACE FUNCTION public.insert_task_with_team_member_context(
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
  v_section_id uuid;
  v_status pm.task_status;
BEGIN
  PERFORM set_config('app.current_team_member_id', p_team_member_id::text, true);

  v_section_id := NULLIF(p_payload->>'section_id', '')::uuid;

  v_status := COALESCE(
    NULLIF(p_payload->>'status', '')::pm.task_status,
    CASE WHEN v_section_id IS NOT NULL THEN public._status_for_section(v_section_id) END,
    'todo'::pm.task_status
  );

  INSERT INTO pm.tasks (
    project_id,
    section_id,
    parent_task_id,
    title,
    description,
    priority,
    assignee_id,
    due_date,
    estimated_hours,
    status,
    is_recurring,
    recurrence_rule,
    recurring_parent_id,
    is_recurring_instance,
    requires_review,
    review_requested_by
  )
  VALUES (
    (p_payload->>'project_id')::uuid,
    v_section_id,
    NULLIF(p_payload->>'parent_task_id', '')::uuid,
    p_payload->>'title',
    NULLIF(p_payload->>'description', ''),
    COALESCE((p_payload->>'priority')::pm.task_priority, 'medium'),
    NULLIF(p_payload->>'assignee_id', '')::uuid,
    NULLIF(p_payload->>'due_date', '')::date,
    NULLIF(p_payload->>'estimated_hours', '')::numeric,
    v_status,
    COALESCE((p_payload->>'is_recurring')::boolean, false),
    NULLIF(p_payload->>'recurrence_rule', ''),
    NULLIF(p_payload->>'recurring_parent_id', '')::uuid,
    COALESCE((p_payload->>'is_recurring_instance')::boolean, false),
    COALESCE((p_payload->>'requires_review')::boolean, false),
    NULLIF(p_payload->>'review_requested_by', '')::uuid
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_task_with_team_member_context(
  p_team_member_id uuid,
  p_task_id uuid,
  p_payload jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pm
AS $$
DECLARE
  v_section_id uuid;
  v_status pm.task_status;
BEGIN
  PERFORM set_config('app.current_team_member_id', p_team_member_id::text, true);

  IF p_payload ? 'section_id' THEN
    v_section_id := NULLIF(p_payload->>'section_id', '')::uuid;
    IF v_section_id IS NOT NULL THEN
      v_status := public._status_for_section(v_section_id);
    END IF;
  END IF;

  UPDATE pm.tasks
  SET
    title = CASE WHEN p_payload ? 'title' THEN p_payload->>'title' ELSE title END,
    description = CASE WHEN p_payload ? 'description' THEN NULLIF(p_payload->>'description', '') ELSE description END,
    status = CASE
      WHEN p_payload ? 'status' THEN (p_payload->>'status')::pm.task_status
      WHEN v_status IS NOT NULL THEN v_status
      ELSE status
    END,
    priority = CASE WHEN p_payload ? 'priority' THEN (p_payload->>'priority')::pm.task_priority ELSE priority END,
    assignee_id = CASE WHEN p_payload ? 'assignee_id' THEN NULLIF(p_payload->>'assignee_id', '')::uuid ELSE assignee_id END,
    due_date = CASE WHEN p_payload ? 'due_date' THEN NULLIF(p_payload->>'due_date', '')::date ELSE due_date END,
    section_id = CASE WHEN p_payload ? 'section_id' THEN NULLIF(p_payload->>'section_id', '')::uuid ELSE section_id END,
    estimated_hours = CASE WHEN p_payload ? 'estimated_hours' THEN NULLIF(p_payload->>'estimated_hours', '')::numeric ELSE estimated_hours END,
    is_recurring = CASE WHEN p_payload ? 'is_recurring' THEN (p_payload->>'is_recurring')::boolean ELSE is_recurring END,
    recurrence_rule = CASE
      WHEN p_payload ? 'recurrence_rule' THEN NULLIF(p_payload->>'recurrence_rule', '')
      ELSE recurrence_rule
    END,
    requires_review = CASE
      WHEN p_payload ? 'requires_review' THEN (p_payload->>'requires_review')::boolean
      ELSE requires_review
    END,
    review_requested_by = CASE
      WHEN p_payload ? 'review_requested_by' THEN NULLIF(p_payload->>'review_requested_by', '')::uuid
      WHEN p_payload ? 'requires_review' AND NOT (p_payload->>'requires_review')::boolean THEN NULL
      ELSE review_requested_by
    END,
    reviewed_by = CASE
      WHEN p_payload ? 'reviewed_by' THEN NULLIF(p_payload->>'reviewed_by', '')::uuid
      ELSE reviewed_by
    END,
    reviewed_at = CASE
      WHEN p_payload ? 'reviewed_at' THEN NULLIF(p_payload->>'reviewed_at', '')::timestamptz
      WHEN p_payload ? 'reviewed_by' AND NULLIF(p_payload->>'reviewed_by', '') IS NULL THEN NULL
      ELSE reviewed_at
    END,
    updated_at = now()
  WHERE id = p_task_id;
END;
$$;

REVOKE ALL ON FUNCTION public.insert_task_with_team_member_context(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_task_with_team_member_context(uuid, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.update_task_with_team_member_context(uuid, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_task_with_team_member_context(uuid, uuid, jsonb) TO service_role;
