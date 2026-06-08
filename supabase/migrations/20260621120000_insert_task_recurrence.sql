-- Support is_recurring and recurrence_rule on task insert.

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
    recurrence_rule
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
    NULLIF(p_payload->>'recurrence_rule', '')
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.insert_task_with_team_member_context(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_task_with_team_member_context(uuid, jsonb) TO service_role;
