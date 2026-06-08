-- Task, comment, time entry, and dependency mutations with team member context.

CREATE OR REPLACE FUNCTION public._status_for_section(p_section_id uuid)
RETURNS pm.task_status
LANGUAGE sql
STABLE
SET search_path = public, pm
AS $$
  SELECT CASE lower(s.name)
    WHEN 'to do' THEN 'todo'::pm.task_status
    WHEN 'in progress' THEN 'in_progress'::pm.task_status
    WHEN 'done' THEN 'done'::pm.task_status
    ELSE 'todo'::pm.task_status
  END
  FROM pm.project_sections s
  WHERE s.id = p_section_id;
$$;

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
    status
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
    v_status
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
    is_recurring = CASE WHEN p_payload ? 'is_recurring' THEN (p_payload->>'is_recurring')::boolean ELSE is_recurring END,
    recurrence_rule = CASE
      WHEN p_payload ? 'recurrence_rule' THEN NULLIF(p_payload->>'recurrence_rule', '')
      ELSE recurrence_rule
    END,
    updated_at = now()
  WHERE id = p_task_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_task_with_team_member_context(
  p_team_member_id uuid,
  p_task_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pm
AS $$
BEGIN
  PERFORM set_config('app.current_team_member_id', p_team_member_id::text, true);

  DELETE FROM pm.tasks WHERE id = p_task_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.insert_task_comment_with_team_member_context(
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
BEGIN
  PERFORM set_config('app.current_team_member_id', p_team_member_id::text, true);

  INSERT INTO pm.task_comments (task_id, body, author_id)
  VALUES (
    (p_payload->>'task_id')::uuid,
    p_payload->>'body',
    p_team_member_id
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_task_comment_with_team_member_context(
  p_team_member_id uuid,
  p_comment_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pm
AS $$
BEGIN
  PERFORM set_config('app.current_team_member_id', p_team_member_id::text, true);

  DELETE FROM pm.task_comments WHERE id = p_comment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.insert_time_entry_with_team_member_context(
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
  v_hours int;
  v_minutes int;
  v_total int;
BEGIN
  PERFORM set_config('app.current_team_member_id', p_team_member_id::text, true);

  v_hours := COALESCE((p_payload->>'hours')::int, 0);
  v_minutes := COALESCE((p_payload->>'minutes')::int, 0);
  v_total := v_hours * 60 + v_minutes;

  IF v_total <= 0 THEN
    RAISE EXCEPTION 'Duration must be greater than zero';
  END IF;

  INSERT INTO pm.time_entries (
    task_id,
    team_member_id,
    duration_minutes,
    billable,
    logged_date,
    description
  )
  VALUES (
    (p_payload->>'task_id')::uuid,
    p_team_member_id,
    v_total,
    COALESCE((p_payload->>'billable')::boolean, true),
    COALESCE(NULLIF(p_payload->>'logged_date', '')::date, CURRENT_DATE),
    NULLIF(p_payload->>'description', '')
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_time_entry_with_team_member_context(
  p_team_member_id uuid,
  p_entry_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pm
AS $$
BEGIN
  PERFORM set_config('app.current_team_member_id', p_team_member_id::text, true);

  DELETE FROM pm.time_entries WHERE id = p_entry_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.insert_task_dependency_with_team_member_context(
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
  v_task_id uuid;
  v_depends_on uuid;
BEGIN
  PERFORM set_config('app.current_team_member_id', p_team_member_id::text, true);

  v_task_id := (p_payload->>'task_id')::uuid;
  v_depends_on := (p_payload->>'depends_on_task_id')::uuid;

  IF v_task_id = v_depends_on THEN
    RAISE EXCEPTION 'A task cannot depend on itself';
  END IF;

  INSERT INTO pm.task_dependencies (task_id, depends_on_task_id)
  VALUES (v_task_id, v_depends_on)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_task_dependency_with_team_member_context(
  p_team_member_id uuid,
  p_dependency_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pm
AS $$
BEGIN
  PERFORM set_config('app.current_team_member_id', p_team_member_id::text, true);

  DELETE FROM pm.task_dependencies WHERE id = p_dependency_id;
END;
$$;

REVOKE ALL ON FUNCTION public.insert_task_with_team_member_context(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_task_with_team_member_context(uuid, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.update_task_with_team_member_context(uuid, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_task_with_team_member_context(uuid, uuid, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.delete_task_with_team_member_context(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_task_with_team_member_context(uuid, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.insert_task_comment_with_team_member_context(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_task_comment_with_team_member_context(uuid, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.delete_task_comment_with_team_member_context(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_task_comment_with_team_member_context(uuid, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.insert_time_entry_with_team_member_context(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_time_entry_with_team_member_context(uuid, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.delete_time_entry_with_team_member_context(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_time_entry_with_team_member_context(uuid, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.insert_task_dependency_with_team_member_context(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_task_dependency_with_team_member_context(uuid, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.delete_task_dependency_with_team_member_context(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_task_dependency_with_team_member_context(uuid, uuid) TO service_role;
