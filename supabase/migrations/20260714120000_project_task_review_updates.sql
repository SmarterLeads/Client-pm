-- Projects: optional due date and owner; task review workflow.

ALTER TABLE pm.projects ALTER COLUMN due_date DROP NOT NULL;
ALTER TABLE pm.projects ALTER COLUMN owner_id DROP NOT NULL;

ALTER TABLE pm.tasks
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES pm.team_members(id),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

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
