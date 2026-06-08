-- Internal projects, tasks, and team meeting mutations with team member context.

CREATE OR REPLACE FUNCTION public._status_for_internal_section(p_section_id uuid)
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
  FROM pm.internal_project_sections s
  WHERE s.id = p_section_id;
$$;

CREATE OR REPLACE FUNCTION public.insert_internal_project_with_team_member_context(
  p_team_member_id uuid,
  p_project jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pm
AS $$
DECLARE
  v_project_id uuid;
BEGIN
  PERFORM set_config('app.current_team_member_id', p_team_member_id::text, true);

  INSERT INTO pm.internal_projects (
    name,
    owner_id,
    description,
    status,
    rag_status,
    start_date,
    due_date
  )
  VALUES (
    p_project->>'name',
    NULLIF(p_project->>'owner_id', '')::uuid,
    NULLIF(p_project->>'description', ''),
    COALESCE((p_project->>'status')::pm.project_status, 'planned'),
    COALESCE((p_project->>'rag_status')::pm.rag_status, 'green'),
    NULLIF(p_project->>'start_date', '')::date,
    NULLIF(p_project->>'due_date', '')::date
  )
  RETURNING id INTO v_project_id;

  INSERT INTO pm.internal_project_sections (project_id, name, display_order)
  VALUES
    (v_project_id, 'To do', 0),
    (v_project_id, 'In progress', 1),
    (v_project_id, 'Done', 2);

  IF NULLIF(p_project->>'owner_id', '') IS NOT NULL THEN
    INSERT INTO pm.internal_project_members (project_id, team_member_id, role)
    VALUES (v_project_id, (p_project->>'owner_id')::uuid, 'lead');
  END IF;

  RETURN v_project_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_internal_project_with_team_member_context(
  p_team_member_id uuid,
  p_project_id uuid,
  p_payload jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pm
AS $$
BEGIN
  PERFORM set_config('app.current_team_member_id', p_team_member_id::text, true);

  UPDATE pm.internal_projects
  SET
    name = CASE WHEN p_payload ? 'name' THEN p_payload->>'name' ELSE name END,
    description = CASE WHEN p_payload ? 'description' THEN NULLIF(p_payload->>'description', '') ELSE description END,
    owner_id = CASE WHEN p_payload ? 'owner_id' THEN NULLIF(p_payload->>'owner_id', '')::uuid ELSE owner_id END,
    status = CASE WHEN p_payload ? 'status' THEN (p_payload->>'status')::pm.project_status ELSE status END,
    rag_status = CASE WHEN p_payload ? 'rag_status' THEN (p_payload->>'rag_status')::pm.rag_status ELSE rag_status END,
    start_date = CASE WHEN p_payload ? 'start_date' THEN NULLIF(p_payload->>'start_date', '')::date ELSE start_date END,
    due_date = CASE WHEN p_payload ? 'due_date' THEN NULLIF(p_payload->>'due_date', '')::date ELSE due_date END,
    updated_at = now()
  WHERE id = p_project_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.insert_internal_section_with_team_member_context(
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
  v_order int;
BEGIN
  PERFORM set_config('app.current_team_member_id', p_team_member_id::text, true);

  SELECT COALESCE(MAX(display_order), -1) + 1 INTO v_order
  FROM pm.internal_project_sections
  WHERE project_id = (p_payload->>'project_id')::uuid;

  INSERT INTO pm.internal_project_sections (project_id, name, display_order)
  VALUES (
    (p_payload->>'project_id')::uuid,
    p_payload->>'name',
    COALESCE((p_payload->>'display_order')::int, v_order)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_internal_task_section_with_team_member_context(
  p_team_member_id uuid,
  p_task_id uuid,
  p_section_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pm
AS $$
DECLARE
  v_status pm.task_status;
BEGIN
  PERFORM set_config('app.current_team_member_id', p_team_member_id::text, true);

  v_status := public._status_for_internal_section(p_section_id);

  UPDATE pm.internal_tasks
  SET
    section_id = p_section_id,
    status = v_status,
    updated_at = now()
  WHERE id = p_task_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.insert_internal_task_with_team_member_context(
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
    CASE WHEN v_section_id IS NOT NULL THEN public._status_for_internal_section(v_section_id) END,
    'todo'::pm.task_status
  );

  INSERT INTO pm.internal_tasks (
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

CREATE OR REPLACE FUNCTION public.update_internal_task_with_team_member_context(
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
      v_status := public._status_for_internal_section(v_section_id);
    END IF;
  END IF;

  UPDATE pm.internal_tasks
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
    recurrence_rule = CASE WHEN p_payload ? 'recurrence_rule' THEN NULLIF(p_payload->>'recurrence_rule', '') ELSE recurrence_rule END,
    updated_at = now()
  WHERE id = p_task_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_internal_task_with_team_member_context(
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
  DELETE FROM pm.internal_tasks WHERE id = p_task_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.insert_meeting_with_team_member_context(
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
  v_participant uuid;
BEGIN
  PERFORM set_config('app.current_team_member_id', p_team_member_id::text, true);

  INSERT INTO pm.team_meetings (
    title,
    type,
    summary,
    body,
    occurred_at,
    created_by,
    visibility
  )
  VALUES (
    p_payload->>'title',
    COALESCE((p_payload->>'type')::pm.meeting_type, 'team_meeting'),
    NULLIF(p_payload->>'summary', ''),
    NULLIF(p_payload->>'body', ''),
    COALESCE((p_payload->>'occurred_at')::timestamptz, now()),
    p_team_member_id,
    COALESCE((p_payload->>'visibility')::pm.meeting_visibility, 'all')
  )
  RETURNING id INTO v_id;

  IF p_payload ? 'participant_ids' AND jsonb_typeof(p_payload->'participant_ids') = 'array' THEN
    FOR v_participant IN
      SELECT (jsonb_array_elements_text(p_payload->'participant_ids'))::uuid
    LOOP
      INSERT INTO pm.meeting_participants (meeting_id, team_member_id)
      VALUES (v_id, v_participant)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_meeting_with_team_member_context(
  p_team_member_id uuid,
  p_meeting_id uuid,
  p_payload jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pm
AS $$
BEGIN
  PERFORM set_config('app.current_team_member_id', p_team_member_id::text, true);

  UPDATE pm.team_meetings
  SET
    title = CASE WHEN p_payload ? 'title' THEN p_payload->>'title' ELSE title END,
    type = CASE WHEN p_payload ? 'type' THEN (p_payload->>'type')::pm.meeting_type ELSE type END,
    summary = CASE WHEN p_payload ? 'summary' THEN NULLIF(p_payload->>'summary', '') ELSE summary END,
    body = CASE WHEN p_payload ? 'body' THEN NULLIF(p_payload->>'body', '') ELSE body END,
    occurred_at = CASE WHEN p_payload ? 'occurred_at' THEN (p_payload->>'occurred_at')::timestamptz ELSE occurred_at END,
    visibility = CASE WHEN p_payload ? 'visibility' THEN (p_payload->>'visibility')::pm.meeting_visibility ELSE visibility END,
    updated_at = now()
  WHERE id = p_meeting_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_meeting_with_team_member_context(
  p_team_member_id uuid,
  p_meeting_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pm
AS $$
BEGIN
  PERFORM set_config('app.current_team_member_id', p_team_member_id::text, true);
  DELETE FROM pm.team_meetings WHERE id = p_meeting_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_meeting_participant_with_team_member_context(
  p_team_member_id uuid,
  p_meeting_id uuid,
  p_participant_id uuid
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

  INSERT INTO pm.meeting_participants (meeting_id, team_member_id)
  VALUES (p_meeting_id, p_participant_id)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_meeting_participant_with_team_member_context(
  p_team_member_id uuid,
  p_participant_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pm
AS $$
BEGIN
  PERFORM set_config('app.current_team_member_id', p_team_member_id::text, true);
  DELETE FROM pm.meeting_participants WHERE id = p_participant_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public._status_for_internal_section(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.insert_internal_project_with_team_member_context(uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_internal_project_with_team_member_context(uuid, uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.insert_internal_section_with_team_member_context(uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_internal_task_section_with_team_member_context(uuid, uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.insert_internal_task_with_team_member_context(uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_internal_task_with_team_member_context(uuid, uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_internal_task_with_team_member_context(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.insert_meeting_with_team_member_context(uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_meeting_with_team_member_context(uuid, uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_meeting_with_team_member_context(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.add_meeting_participant_with_team_member_context(uuid, uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.remove_meeting_participant_with_team_member_context(uuid, uuid) TO service_role;
