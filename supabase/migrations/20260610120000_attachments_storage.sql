-- Private attachments bucket + storage RLS + attachments table policies

INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', false)
ON CONFLICT (id) DO UPDATE SET public = false;

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

CREATE OR REPLACE FUNCTION public.storage_path_visible_to_client(
  p_client_id uuid,
  p_path text
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, pm
AS $$
  SELECT public.attachment_visible_to_client(
    p_client_id,
    (storage.foldername(p_path))[1],
    ((storage.foldername(p_path))[2])::uuid
  );
$$;

ALTER TABLE pm.attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_members_attachments_all" ON pm.attachments;
CREATE POLICY "team_members_attachments_all"
ON pm.attachments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM pm.team_members tm
    WHERE tm.auth_user_id = auth.uid() AND tm.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM pm.team_members tm
    WHERE tm.auth_user_id = auth.uid() AND tm.is_active = true
  )
);

DROP POLICY IF EXISTS "portal_users_attachments_select" ON pm.attachments;
CREATE POLICY "portal_users_attachments_select"
ON pm.attachments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM pm.client_portal_users cu
    WHERE cu.auth_user_id = auth.uid()
      AND public.attachment_visible_to_client(
        cu.client_id,
        entity_type,
        entity_id
      )
  )
);

DROP POLICY IF EXISTS "team_members_storage_attachments_select" ON storage.objects;
CREATE POLICY "team_members_storage_attachments_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'attachments'
  AND EXISTS (
    SELECT 1 FROM pm.team_members tm
    WHERE tm.auth_user_id = auth.uid() AND tm.is_active = true
  )
);

DROP POLICY IF EXISTS "team_members_storage_attachments_insert" ON storage.objects;
CREATE POLICY "team_members_storage_attachments_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'attachments'
  AND EXISTS (
    SELECT 1 FROM pm.team_members tm
    WHERE tm.auth_user_id = auth.uid() AND tm.is_active = true
  )
);

DROP POLICY IF EXISTS "team_members_storage_attachments_delete" ON storage.objects;
CREATE POLICY "team_members_storage_attachments_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'attachments'
  AND EXISTS (
    SELECT 1 FROM pm.team_members tm
    WHERE tm.auth_user_id = auth.uid() AND tm.is_active = true
  )
);

DROP POLICY IF EXISTS "portal_users_storage_attachments_select" ON storage.objects;
CREATE POLICY "portal_users_storage_attachments_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'attachments'
  AND EXISTS (
    SELECT 1 FROM pm.client_portal_users cu
    WHERE cu.auth_user_id = auth.uid()
      AND public.storage_path_visible_to_client(cu.client_id, name)
  )
);
