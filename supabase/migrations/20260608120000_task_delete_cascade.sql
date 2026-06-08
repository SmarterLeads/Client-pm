-- Ensure task deletion removes subtasks, comments, time entries, and dependencies.
CREATE OR REPLACE FUNCTION public.delete_task_with_team_member_context(
  p_team_member_id uuid,
  p_task_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pm
AS $$
DECLARE
  r record;
BEGIN
  PERFORM set_config('app.current_team_member_id', p_team_member_id::text, true);

  -- Delete deepest descendants first, then the root task.
  FOR r IN
    WITH RECURSIVE task_tree AS (
      SELECT id, 0 AS depth
      FROM pm.tasks
      WHERE id = p_task_id
      UNION ALL
      SELECT t.id, tt.depth + 1
      FROM pm.tasks t
      INNER JOIN task_tree tt ON t.parent_task_id = tt.id
    )
    SELECT id
    FROM task_tree
    ORDER BY depth DESC
  LOOP
    DELETE FROM pm.task_dependencies
    WHERE task_id = r.id OR depends_on_task_id = r.id;

    DELETE FROM pm.time_entries WHERE task_id = r.id;
    DELETE FROM pm.task_comments WHERE task_id = r.id;
    DELETE FROM pm.tasks WHERE id = r.id;
  END LOOP;
END;
$$;
