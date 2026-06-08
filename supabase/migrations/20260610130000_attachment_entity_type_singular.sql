-- Align storage visibility helpers with attachments.entity_type check constraint
-- (singular: client, project, task, interaction)

CREATE OR REPLACE FUNCTION public.attachment_visible_to_client(
  p_client_id uuid,
  p_entity_type text,
  p_entity_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, pm
AS $$
  SELECT CASE
    WHEN p_entity_type = 'client' THEN p_entity_id = p_client_id
    WHEN p_entity_type = 'project' THEN EXISTS (
      SELECT 1 FROM pm.projects
      WHERE id = p_entity_id AND client_id = p_client_id
    )
    WHEN p_entity_type = 'task' THEN EXISTS (
      SELECT 1 FROM pm.tasks t
      JOIN pm.projects p ON p.id = t.project_id
      WHERE t.id = p_entity_id AND p.client_id = p_client_id
    )
    WHEN p_entity_type = 'interaction' THEN EXISTS (
      SELECT 1 FROM pm.interactions
      WHERE id = p_entity_id AND client_id = p_client_id
    )
    ELSE false
  END;
$$;
