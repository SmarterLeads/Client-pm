"use server";

import { pm } from "@/lib/supabase/pm";
import { createServiceClient } from "@/lib/supabase/service";
import { insertTaskWithTeamMemberContext } from "@/lib/supabase/with-team-member-context";
import {
  ensureDoneSectionId,
  findTodoSectionId,
} from "@/lib/tasks/done-section";
import {
  calculateOccurrenceDates,
  parseRecurrenceRule,
  calculateNextOccurrence,
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

function todayIsoDate(): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString().slice(0, 10);
}

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

async function existingInstances(parentTaskId: string) {
  const supabase = createServiceClient();
  const { data, error } = await pm(supabase)
    .from("tasks")
    .select("id, due_date")
    .eq("recurring_parent_id", parentTaskId)
    .eq("is_recurring_instance", true);

  if (error) {
    console.error("[existingInstances]", error.message);
    return new Map<string, string>();
  }

  return new Map(
    (data ?? [])
      .filter((row): row is { id: string; due_date: string } => Boolean(row.due_date))
      .map((row) => [row.due_date, row.id]),
  );
}

async function createInstance(
  teamMemberId: string,
  parent: RecurringParentTask,
  dueDate: string,
  sectionId: string | null,
  status: "todo" | "done",
): Promise<void> {
  await insertTaskWithTeamMemberContext(teamMemberId, {
    project_id: parent.project_id,
    section_id: sectionId,
    title: parent.title,
    priority: parent.priority,
    assignee_id: parent.assignee_id,
    due_date: dueDate,
    status,
    is_recurring: false,
    recurring_parent_id: parent.id,
    is_recurring_instance: true,
  });
}

function resolveOccurrenceDates(
  parent: RecurringParentTask,
  rule: NonNullable<ReturnType<typeof parseRecurrenceRule>>,
): string[] {
  const anchor = parent.due_date
    ? new Date(`${parent.due_date}T00:00:00`)
    : new Date();

  return calculateOccurrenceDates(rule, anchor);
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

  const targetDates = resolveOccurrenceDates(parent, rule);
  if (targetDates.length === 0) {
    console.log("[recurring] no occurrence dates calculated for:", parentTaskId);
    return;
  }

  const supabase = createServiceClient();
  const sections = await loadProjectSections(parent.project_id);
  const todoSectionId = findTodoSectionId(sections) ?? parent.section_id;
  const doneSectionId = await ensureDoneSectionId(supabase, parent.project_id);
  const existing = await existingInstances(parent.id);
  const today = todayIsoDate();

  for (const dueDate of targetDates) {
    if (existing.has(dueDate)) continue;

    const isPast = dueDate < today;
    const sectionId = isPast ? doneSectionId ?? todoSectionId : todoSectionId;
    const status = isPast ? "done" : "todo";

    await createInstance(
      teamMemberId,
      parent,
      dueDate,
      sectionId,
      status,
    );
  }
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

  const existing = await existingInstances(parent.id);
  if (existing.has(nextDate)) return;

  const sections = await loadProjectSections(parent.project_id);
  const todoSectionId = findTodoSectionId(sections) ?? parent.section_id;

  console.log("[recurring] generating instances for:", parent.id);
  await createInstance(teamMemberId, parent, nextDate, todoSectionId, "todo");
}
