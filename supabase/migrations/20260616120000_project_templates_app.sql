-- App layer for project templates (tables from migration 005).
-- Adds template_id on projects, skip-default-sections on project create, and team-context RPCs.

ALTER TABLE pm.projects
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES pm.project_templates(id) ON DELETE SET NULL;

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
  v_skip_sections boolean;
BEGIN
  PERFORM set_config('app.current_team_member_id', p_team_member_id::text, true);

  v_skip_sections := COALESCE((p_project->>'skip_default_sections')::boolean, false);

  INSERT INTO pm.projects (
    name,
    client_id,
    owner_id,
    description,
    status,
    rag_status,
    start_date,
    due_date,
    template_id
  )
  VALUES (
    p_project->>'name',
    (p_project->>'client_id')::uuid,
    NULLIF(p_project->>'owner_id', '')::uuid,
    NULLIF(p_project->>'description', ''),
    COALESCE((p_project->>'status')::pm.project_status, 'planned'),
    COALESCE((p_project->>'rag_status')::pm.rag_status, 'green'),
    NULLIF(p_project->>'start_date', '')::date,
    NULLIF(p_project->>'due_date', '')::date,
    NULLIF(p_project->>'template_id', '')::uuid
  )
  RETURNING id INTO v_project_id;

  IF NOT v_skip_sections THEN
    INSERT INTO pm.project_sections (project_id, name, display_order)
    VALUES
      (v_project_id, 'To do', 0),
      (v_project_id, 'In progress', 1),
      (v_project_id, 'Done', 2);
  END IF;

  IF NULLIF(p_project->>'owner_id', '') IS NOT NULL THEN
    INSERT INTO pm.project_members (project_id, team_member_id, role)
    VALUES (v_project_id, (p_project->>'owner_id')::uuid, 'lead');
  END IF;

  RETURN v_project_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.insert_project_template_with_team_member_context(
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

  INSERT INTO pm.project_templates (name, description, is_active, created_by)
  VALUES (
    p_payload->>'name',
    NULLIF(p_payload->>'description', ''),
    COALESCE((p_payload->>'is_active')::boolean, true),
    p_team_member_id
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_project_template_with_team_member_context(
  p_team_member_id uuid,
  p_template_id uuid,
  p_payload jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pm
AS $$
BEGIN
  PERFORM set_config('app.current_team_member_id', p_team_member_id::text, true);

  UPDATE pm.project_templates
  SET
    name = CASE WHEN p_payload ? 'name' THEN p_payload->>'name' ELSE name END,
    description = CASE WHEN p_payload ? 'description' THEN NULLIF(p_payload->>'description', '') ELSE description END,
    is_active = CASE WHEN p_payload ? 'is_active' THEN (p_payload->>'is_active')::boolean ELSE is_active END,
    updated_at = now()
  WHERE id = p_template_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_project_template_with_team_member_context(
  p_team_member_id uuid,
  p_template_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pm
AS $$
BEGIN
  PERFORM set_config('app.current_team_member_id', p_team_member_id::text, true);

  DELETE FROM pm.project_template_tasks WHERE template_id = p_template_id;
  DELETE FROM pm.project_template_sections WHERE template_id = p_template_id;
  DELETE FROM pm.project_templates WHERE id = p_template_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.duplicate_project_template_with_team_member_context(
  p_team_member_id uuid,
  p_template_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pm
AS $$
DECLARE
  v_new_id uuid;
  v_section record;
  v_task record;
  v_section_map jsonb := '{}'::jsonb;
  v_task_map jsonb := '{}'::jsonb;
  v_new_section_id uuid;
  v_new_task_id uuid;
  v_new_parent uuid;
BEGIN
  PERFORM set_config('app.current_team_member_id', p_team_member_id::text, true);

  INSERT INTO pm.project_templates (name, description, is_active, created_by)
  SELECT name || ' (copy)', description, is_active, p_team_member_id
  FROM pm.project_templates
  WHERE id = p_template_id
  RETURNING id INTO v_new_id;

  FOR v_section IN
    SELECT * FROM pm.project_template_sections
    WHERE template_id = p_template_id
    ORDER BY display_order
  LOOP
    INSERT INTO pm.project_template_sections (template_id, name, display_order)
    VALUES (v_new_id, v_section.name, v_section.display_order)
    RETURNING id INTO v_new_section_id;

    v_section_map := v_section_map || jsonb_build_object(v_section.id::text, v_new_section_id);
  END LOOP;

  FOR v_task IN
    SELECT * FROM pm.project_template_tasks
    WHERE template_id = p_template_id
    ORDER BY display_order
  LOOP
    v_new_parent := NULL;
    IF v_task.parent_task_id IS NOT NULL THEN
      v_new_parent := (v_task_map->>v_task.parent_task_id::text)::uuid;
    END IF;

    INSERT INTO pm.project_template_tasks (
      template_id,
      section_id,
      parent_task_id,
      title,
      description,
      priority,
      assignee_id,
      estimated_hours,
      days_from_start,
      display_order
    )
    VALUES (
      v_new_id,
      (v_section_map->>v_task.section_id::text)::uuid,
      v_new_parent,
      v_task.title,
      v_task.description,
      v_task.priority,
      v_task.assignee_id,
      v_task.estimated_hours,
      v_task.days_from_start,
      v_task.display_order
    )
    RETURNING id INTO v_new_task_id;

    v_task_map := v_task_map || jsonb_build_object(v_task.id::text, v_new_task_id);
  END LOOP;

  RETURN v_new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.insert_project_template_section_with_team_member_context(
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

  INSERT INTO pm.project_template_sections (template_id, name, display_order)
  VALUES (
    (p_payload->>'template_id')::uuid,
    p_payload->>'name',
    COALESCE((p_payload->>'display_order')::int, 0)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_project_template_section_with_team_member_context(
  p_team_member_id uuid,
  p_section_id uuid,
  p_payload jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pm
AS $$
BEGIN
  PERFORM set_config('app.current_team_member_id', p_team_member_id::text, true);

  UPDATE pm.project_template_sections
  SET
    name = CASE WHEN p_payload ? 'name' THEN p_payload->>'name' ELSE name END,
    display_order = CASE WHEN p_payload ? 'display_order' THEN (p_payload->>'display_order')::int ELSE display_order END
  WHERE id = p_section_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_project_template_section_with_team_member_context(
  p_team_member_id uuid,
  p_section_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pm
AS $$
BEGIN
  PERFORM set_config('app.current_team_member_id', p_team_member_id::text, true);

  DELETE FROM pm.project_template_tasks WHERE section_id = p_section_id;
  DELETE FROM pm.project_template_sections WHERE id = p_section_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.insert_project_template_task_with_team_member_context(
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

  INSERT INTO pm.project_template_tasks (
    template_id,
    section_id,
    parent_task_id,
    title,
    description,
    priority,
    assignee_id,
    estimated_hours,
    days_from_start,
    display_order
  )
  VALUES (
    (p_payload->>'template_id')::uuid,
    (p_payload->>'section_id')::uuid,
    NULLIF(p_payload->>'parent_task_id', '')::uuid,
    p_payload->>'title',
    NULLIF(p_payload->>'description', ''),
    COALESCE((p_payload->>'priority')::pm.task_priority, 'medium'),
    NULLIF(p_payload->>'assignee_id', '')::uuid,
    NULLIF(p_payload->>'estimated_hours', '')::numeric,
    NULLIF(p_payload->>'days_from_start', '')::int,
    COALESCE((p_payload->>'display_order')::int, 0)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_project_template_task_with_team_member_context(
  p_team_member_id uuid,
  p_task_id uuid,
  p_payload jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pm
AS $$
BEGIN
  PERFORM set_config('app.current_team_member_id', p_team_member_id::text, true);

  UPDATE pm.project_template_tasks
  SET
    title = CASE WHEN p_payload ? 'title' THEN p_payload->>'title' ELSE title END,
    description = CASE WHEN p_payload ? 'description' THEN NULLIF(p_payload->>'description', '') ELSE description END,
    priority = CASE WHEN p_payload ? 'priority' THEN (p_payload->>'priority')::pm.task_priority ELSE priority END,
    assignee_id = CASE WHEN p_payload ? 'assignee_id' THEN NULLIF(p_payload->>'assignee_id', '')::uuid ELSE assignee_id END,
    estimated_hours = CASE WHEN p_payload ? 'estimated_hours' THEN NULLIF(p_payload->>'estimated_hours', '')::numeric ELSE estimated_hours END,
    days_from_start = CASE WHEN p_payload ? 'days_from_start' THEN NULLIF(p_payload->>'days_from_start', '')::int ELSE days_from_start END,
    section_id = CASE WHEN p_payload ? 'section_id' THEN (p_payload->>'section_id')::uuid ELSE section_id END,
    parent_task_id = CASE WHEN p_payload ? 'parent_task_id' THEN NULLIF(p_payload->>'parent_task_id', '')::uuid ELSE parent_task_id END,
    display_order = CASE WHEN p_payload ? 'display_order' THEN (p_payload->>'display_order')::int ELSE display_order END
  WHERE id = p_task_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_project_template_task_with_team_member_context(
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

  DELETE FROM pm.project_template_tasks WHERE id = p_task_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_project_template_with_team_member_context(
  p_team_member_id uuid,
  p_project_id uuid,
  p_template_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pm
AS $$
BEGIN
  PERFORM set_config('app.current_team_member_id', p_team_member_id::text, true);

  PERFORM pm.apply_project_template(p_project_id, p_template_id, p_team_member_id);

  UPDATE pm.projects
  SET template_id = p_template_id, updated_at = now()
  WHERE id = p_project_id;
END;
$$;

REVOKE ALL ON FUNCTION public.insert_project_template_with_team_member_context(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_project_template_with_team_member_context(uuid, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.update_project_template_with_team_member_context(uuid, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_project_template_with_team_member_context(uuid, uuid, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.delete_project_template_with_team_member_context(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_project_template_with_team_member_context(uuid, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.duplicate_project_template_with_team_member_context(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.duplicate_project_template_with_team_member_context(uuid, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.insert_project_template_section_with_team_member_context(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_project_template_section_with_team_member_context(uuid, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.update_project_template_section_with_team_member_context(uuid, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_project_template_section_with_team_member_context(uuid, uuid, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.delete_project_template_section_with_team_member_context(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_project_template_section_with_team_member_context(uuid, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.insert_project_template_task_with_team_member_context(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_project_template_task_with_team_member_context(uuid, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.update_project_template_task_with_team_member_context(uuid, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_project_template_task_with_team_member_context(uuid, uuid, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.delete_project_template_task_with_team_member_context(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_project_template_task_with_team_member_context(uuid, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.apply_project_template_with_team_member_context(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_project_template_with_team_member_context(uuid, uuid, uuid) TO service_role;
