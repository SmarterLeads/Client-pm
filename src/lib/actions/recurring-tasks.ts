"use server";

import { pm } from "@/lib/supabase/pm";
import { createServiceClient } from "@/lib/supabase/service";
import { insertTaskWithTeamMemberContext } from "@/lib/supabase/with-team-member-context";
import { findTodoSectionId } from "@/lib/tasks/done-section";
import {
  calculateNextOccurrence,
  calculateNextOccurrenceAfterToday,
  parseRecurrenceRule,
} from "@/lib/tasks/recurrence";

type RecurringParentTask = {
  id: string;
  project_id: string;
  title: string;
  priority: string;
  assignee_id: string | null;
  section_id: string | null;
  due_date: string | null;
  is_recurring: boolean;
  recurrence_rule: string | null;
};

type RecurringInstanceRow = {
  id: string;
  due_date: string | null;
  status: string;
};

async function loadRecurringParent(
  parentTaskId: string,
): Promise<RecurringParentTask | null> {
  const supabase = createServiceClient();
  const { data, error } = await pm(supabase)
    .from("tasks")
    .select(
      "id, project_id, title, priority, assignee_id, section_id, due_date, is_recurring, recurrence_rule",
    )
    .eq("id", parentTaskId)
    .maybeSingle();

  if (error) {
    console.error("[loadRecurringParent]", error.message);
    return null;
  }

  return data;
}

async function loadProjectSections(projectId: string) {
  const supabase = createServiceClient();
  const { data, error } = await pm(supabase)
    .from("project_sections")
    .select("id, name, display_order")
    .eq("project_id", projectId)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("[loadProjectSections]", error.message);
    return [];
  }

  return data ?? [];
}

async function loadInstances(parentTaskId: string): Promise<RecurringInstanceRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await pm(supabase)
    .from("tasks")
    .select("id, due_date, status")
    .eq("recurring_parent_id", parentTaskId)
    .eq("is_recurring_instance", true);

  if (error) {
    console.error("[loadInstances]", error.message);
    return [];
  }

  return data ?? [];
}

function isClosedStatus(status: string): boolean {
  return status === "done" || status === "cancelled";
}

function resolveNextInstanceDueDate(
  rule: NonNullable<ReturnType<typeof parseRecurrenceRule>>,
  instances: RecurringInstanceRow[],
): string | null {
  const openInstance = instances.find((row) => !isClosedStatus(row.status));
  if (openInstance) return null;

  const datedInstances = instances.filter(
    (row): row is RecurringInstanceRow & { due_date: string } =>
      Boolean(row.due_date),
  );

  if (datedInstances.length === 0) {
    return calculateNextOccurrenceAfterToday(rule);
  }

  const latest = datedInstances.sort((a, b) =>
    b.due_date.localeCompare(a.due_date),
  )[0];

  return calculateNextOccurrence(
    rule,
    new Date(`${latest.due_date}T00:00:00`),
  );
}

async function createInstance(
  teamMemberId: string,
  parent: RecurringParentTask,
  dueDate: string,
  sectionId: string | null,
): Promise<void> {
  await insertTaskWithTeamMemberContext(teamMemberId, {
    project_id: parent.project_id,
    section_id: sectionId,
    title: parent.title,
    priority: parent.priority,
    assignee_id: parent.assignee_id,
    due_date: dueDate,
    status: "todo",
    is_recurring: false,
    recurring_parent_id: parent.id,
    is_recurring_instance: true,
  });
}

export async function generateRecurringInstances(
  teamMemberId: string,
  parentTaskId: string,
): Promise<void> {
  console.log("[recurring] generating instances for:", parentTaskId);

  const parent = await loadRecurringParent(parentTaskId);
  if (!parent?.is_recurring) {
    console.log("[recurring] parent is not recurring, skipping:", parentTaskId);
    return;
  }

  const rule = parseRecurrenceRule(parent.recurrence_rule);
  if (!rule) {
    console.log("[recurring] no valid recurrence rule for:", parentTaskId);
    return;
  }

  const instances = await loadInstances(parent.id);
  const nextDueDate = resolveNextInstanceDueDate(rule, instances);
  if (!nextDueDate) {
    console.log("[recurring] open instance already exists or no next date:", parentTaskId);
    return;
  }

  if (instances.some((row) => row.due_date === nextDueDate)) {
    console.log("[recurring] instance already exists for date:", nextDueDate);
    return;
  }

  const sections = await loadProjectSections(parent.project_id);
  const todoSectionId = findTodoSectionId(sections) ?? parent.section_id;

  await createInstance(teamMemberId, parent, nextDueDate, todoSectionId);
}

/** @deprecated Use generateRecurringInstances */
export const syncRecurringInstances = generateRecurringInstances;

export async function completeRecurringInstance(
  teamMemberId: string,
  instanceTaskId: string,
): Promise<void> {
  const supabase = createServiceClient();
  const { data: instance, error } = await pm(supabase)
    .from("tasks")
    .select("id, due_date, recurring_parent_id, is_recurring_instance, project_id")
    .eq("id", instanceTaskId)
    .maybeSingle();

  if (error || !instance?.is_recurring_instance || !instance.recurring_parent_id) {
    return;
  }

  const parent = await loadRecurringParent(instance.recurring_parent_id);
  if (!parent?.is_recurring) return;

  const rule = parseRecurrenceRule(parent.recurrence_rule);
  if (!rule || !instance.due_date) return;

  const reference = new Date(`${instance.due_date}T00:00:00`);
  const nextDate = calculateNextOccurrence(rule, reference);
  if (!nextDate) return;

  const instances = await loadInstances(parent.id);
  if (instances.some((row) => row.due_date === nextDate)) return;

  const openInstance = instances.find(
    (row) => row.id !== instanceTaskId && !isClosedStatus(row.status),
  );
  if (openInstance) return;

  const sections = await loadProjectSections(parent.project_id);
  const todoSectionId = findTodoSectionId(sections) ?? parent.section_id;

  console.log("[recurring] generating instances for:", parent.id);
  await createInstance(teamMemberId, parent, nextDate, todoSectionId);
}
