import { pm } from "@/lib/supabase/pm";
import { createClient } from "@/lib/supabase/server";
import type {
  TemplateDetail,
  TemplateListRow,
  TemplatePreview,
  TemplateSelectOption,
} from "@/lib/templates/types";

export async function getTemplates(): Promise<TemplateListRow[]> {
  const supabase = await createClient();

  const { data: templates, error } = await pm(supabase)
    .from("project_templates")
    .select(
      `
      id,
      name,
      description,
      is_active,
      created_at,
      created_by,
      sections:project_template_sections(id),
      tasks:project_template_tasks(id)
    `,
    )
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);

  const creatorIds = [
    ...new Set(
      (templates ?? [])
        .map((row) => row.created_by)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const creatorNames = new Map<string, string>();
  if (creatorIds.length > 0) {
    const { data: creators, error: creatorsError } = await pm(supabase)
      .from("team_members")
      .select("id, name")
      .in("id", creatorIds);

    if (creatorsError) throw new Error(creatorsError.message);
    for (const creator of creators ?? []) {
      creatorNames.set(creator.id, creator.name);
    }
  }

  return (templates ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    is_active: row.is_active,
    section_count: row.sections?.length ?? 0,
    task_count: row.tasks?.length ?? 0,
    created_by_name: row.created_by
      ? (creatorNames.get(row.created_by) ?? null)
      : null,
    created_at: row.created_at,
  }));
}

export async function getActiveTemplatesForSelect(): Promise<
  TemplateSelectOption[]
> {
  const supabase = await createClient();
  const { data, error } = await pm(supabase)
    .from("project_templates")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getTemplateById(id: string): Promise<TemplateDetail | null> {
  const supabase = await createClient();

  const { data: template, error } = await pm(supabase)
    .from("project_templates")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !template) return null;

  let created_by_name: string | null = null;
  if (template.created_by) {
    const { data: creator } = await pm(supabase)
      .from("team_members")
      .select("name")
      .eq("id", template.created_by)
      .maybeSingle();
    created_by_name = creator?.name ?? null;
  }

  const { data: sections, error: sectionsError } = await pm(supabase)
    .from("project_template_sections")
    .select("*")
    .eq("template_id", id)
    .order("display_order", { ascending: true });

  if (sectionsError) throw new Error(sectionsError.message);

  const { data: tasks, error: tasksError } = await pm(supabase)
    .from("project_template_tasks")
    .select("*")
    .eq("template_id", id)
    .order("display_order", { ascending: true });

  if (tasksError) throw new Error(tasksError.message);

  const tasksBySection = new Map<string, typeof tasks>();
  for (const section of sections ?? []) {
    tasksBySection.set(section.id, []);
  }
  for (const task of tasks ?? []) {
    const list = tasksBySection.get(task.section_id);
    if (list) list.push(task);
  }

  return {
    template: {
      id: template.id,
      name: template.name,
      description: template.description,
      is_active: template.is_active,
      created_by: template.created_by,
      created_at: template.created_at,
      updated_at: template.updated_at,
    },
    created_by_name,
    sections: (sections ?? []).map((section) => ({
      ...section,
      tasks: tasksBySection.get(section.id) ?? [],
    })),
  };
}

export async function getTemplatePreview(
  id: string,
): Promise<TemplatePreview | null> {
  const detail = await getTemplateById(id);
  if (!detail) return null;

  const taskCount = detail.sections.reduce(
    (sum, section) => sum + section.tasks.length,
    0,
  );

  return {
    id: detail.template.id,
    name: detail.template.name,
    section_count: detail.sections.length,
    task_count: taskCount,
    sections: detail.sections.map((section) => ({
      id: section.id,
      name: section.name,
      tasks: section.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        parent_task_id: task.parent_task_id,
        priority: task.priority,
      })),
    })),
  };
}

export async function getProjectTemplateName(
  templateId: string | null | undefined,
): Promise<string | null> {
  if (!templateId) return null;

  const supabase = await createClient();
  const { data, error } = await pm(supabase)
    .from("project_templates")
    .select("name")
    .eq("id", templateId)
    .maybeSingle();

  if (error || !data) return null;
  return data.name;
}
