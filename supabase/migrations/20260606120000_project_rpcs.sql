-- Project mutations with set_team_member_context in a single transaction.

CREATE OR REPLACE FUNCTION public.insert_project_with_team_member_context(
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

  INSERT INTO pm.projects (
    name,
    client_id,
    owner_id,
    description,
    status,
    rag_status,
    start_date,
    due_date
  )
  VALUES (
    p_project->>'name',
    (p_project->>'client_id')::uuid,
    NULLIF(p_project->>'owner_id', '')::uuid,
    NULLIF(p_project->>'description', ''),
    COALESCE((p_project->>'status')::pm.project_status, 'planned'),
    COALESCE((p_project->>'rag_status')::pm.rag_status, 'green'),
    NULLIF(p_project->>'start_date', '')::date,
    NULLIF(p_project->>'due_date', '')::date
  )
  RETURNING id INTO v_project_id;

  INSERT INTO pm.project_sections (project_id, name, display_order)
  VALUES
    (v_project_id, 'To do', 0),
    (v_project_id, 'In progress', 1),
    (v_project_id, 'Done', 2);

  IF NULLIF(p_project->>'owner_id', '') IS NOT NULL THEN
    INSERT INTO pm.project_members (project_id, team_member_id, role)
    VALUES (v_project_id, (p_project->>'owner_id')::uuid, 'lead');
  END IF;

  RETURN v_project_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_task_section_with_team_member_context(
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
  v_section_name text;
  v_status pm.task_status;
BEGIN
  PERFORM set_config('app.current_team_member_id', p_team_member_id::text, true);

  SELECT name INTO v_section_name
  FROM pm.project_sections
  WHERE id = p_section_id;

  IF v_section_name IS NULL THEN
    RAISE EXCEPTION 'Section not found: %', p_section_id;
  END IF;

  v_status := CASE lower(v_section_name)
    WHEN 'to do' THEN 'todo'::pm.task_status
    WHEN 'in progress' THEN 'in_progress'::pm.task_status
    WHEN 'done' THEN 'done'::pm.task_status
    ELSE NULL
  END;

  UPDATE pm.tasks
  SET
    section_id = p_section_id,
    status = COALESCE(v_status, status),
    updated_at = now()
  WHERE id = p_task_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.insert_milestone_with_team_member_context(
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

  INSERT INTO pm.milestones (
    project_id,
    title,
    description,
    target_date
  )
  VALUES (
    (p_payload->>'project_id')::uuid,
    p_payload->>'title',
    NULLIF(p_payload->>'description', ''),
    NULLIF(p_payload->>'target_date', '')::date
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_milestone_with_team_member_context(
  p_team_member_id uuid,
  p_milestone_id uuid,
  p_payload jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pm
AS $$
BEGIN
  PERFORM set_config('app.current_team_member_id', p_team_member_id::text, true);

  UPDATE pm.milestones
  SET
    title = CASE WHEN p_payload ? 'title' THEN p_payload->>'title' ELSE title END,
    description = CASE WHEN p_payload ? 'description' THEN NULLIF(p_payload->>'description', '') ELSE description END,
    target_date = CASE WHEN p_payload ? 'target_date' THEN NULLIF(p_payload->>'target_date', '')::date ELSE target_date END,
    completed = CASE WHEN p_payload ? 'completed' THEN (p_payload->>'completed')::boolean ELSE completed END,
    completed_at = CASE
      WHEN p_payload ? 'completed' AND (p_payload->>'completed')::boolean THEN now()
      WHEN p_payload ? 'completed' AND NOT (p_payload->>'completed')::boolean THEN NULL
      ELSE completed_at
    END,
    updated_at = now()
  WHERE id = p_milestone_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.insert_project_member_with_team_member_context(
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

  INSERT INTO pm.project_members (project_id, team_member_id, role)
  VALUES (
    (p_payload->>'project_id')::uuid,
    (p_payload->>'team_member_id')::uuid,
    COALESCE((p_payload->>'role')::pm.project_member_role, 'contributor')
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_project_member_with_team_member_context(
  p_team_member_id uuid,
  p_member_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pm
AS $$
BEGIN
  PERFORM set_config('app.current_team_member_id', p_team_member_id::text, true);

  DELETE FROM pm.project_members
  WHERE id = p_member_id;
END;
$$;

REVOKE ALL ON FUNCTION public.insert_project_with_team_member_context(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_project_with_team_member_context(uuid, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.update_task_section_with_team_member_context(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_task_section_with_team_member_context(uuid, uuid, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.insert_milestone_with_team_member_context(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_milestone_with_team_member_context(uuid, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.update_milestone_with_team_member_context(uuid, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_milestone_with_team_member_context(uuid, uuid, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.insert_project_member_with_team_member_context(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_project_member_with_team_member_context(uuid, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.delete_project_member_with_team_member_context(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_project_member_with_team_member_context(uuid, uuid) TO service_role;
