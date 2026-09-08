-- Task view preference per team member + recurring task instance columns.

ALTER TABLE pm.team_members
  ADD COLUMN IF NOT EXISTS task_view_preference text NOT NULL DEFAULT 'list';

ALTER TABLE pm.team_members
  DROP CONSTRAINT IF EXISTS team_members_task_view_preference_check;

ALTER TABLE pm.team_members
  ADD CONSTRAINT team_members_task_view_preference_check
  CHECK (task_view_preference IN ('list', 'board'));

ALTER TABLE pm.tasks
  ADD COLUMN IF NOT EXISTS recurring_parent_id uuid
    REFERENCES pm.tasks(id) ON DELETE CASCADE;

ALTER TABLE pm.tasks
  ADD COLUMN IF NOT EXISTS is_recurring_instance boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS tasks_recurring_parent_id_idx
  ON pm.tasks (recurring_parent_id);

CREATE INDEX IF NOT EXISTS tasks_recurring_instance_due_idx
  ON pm.tasks (project_id, is_recurring_instance, due_date);
