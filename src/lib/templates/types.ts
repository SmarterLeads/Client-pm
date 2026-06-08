import type { TaskPriority } from "@/lib/types";

export type ProjectTemplate = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectTemplateSection = {
  id: string;
  template_id: string;
  name: string;
  display_order: number;
};

export type ProjectTemplateTask = {
  id: string;
  template_id: string;
  section_id: string;
  parent_task_id: string | null;
  title: string;
  description: string | null;
  priority: TaskPriority;
  assignee_id: string | null;
  estimated_hours: number | null;
  days_from_start: number | null;
  display_order: number;
};

export type TemplateListRow = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  section_count: number;
  task_count: number;
  created_by_name: string | null;
  created_at: string;
};

export type TemplateSectionWithTasks = ProjectTemplateSection & {
  tasks: ProjectTemplateTask[];
};

export type TemplateDetail = {
  template: ProjectTemplate;
  sections: TemplateSectionWithTasks[];
  created_by_name: string | null;
};

export type TemplatePreview = {
  id: string;
  name: string;
  section_count: number;
  task_count: number;
  sections: {
    id: string;
    name: string;
    tasks: {
      id: string;
      title: string;
      parent_task_id: string | null;
      priority: TaskPriority;
    }[];
  }[];
};

export type TemplateSelectOption = {
  id: string;
  name: string;
};
