"use server";

import { pm } from "@/lib/supabase/pm";
import { createServiceClient } from "@/lib/supabase/service";
import { insertTaskWithTeamMemberContext } from "@/lib/supabase/with-team-member-context";
import { findTodoSectionId } from "@/lib/tasks/done-section";
import {
  calculateNextOccurrence,
  calculateOccurrenceDates,
  parseRecurrenceRule,
} from "@/lib/tasks/recurrence";

const INSTANCE_HORIZON_DAYS = 28;

type RecurringParentTask = {
  id: string;
  project_id: string;
  title: string;
  priority: string;
  assignee_id: string | null;
  section_id: string | null;
  is_recurring: boolean;
  recurrence_rule: string | null;
};

async function loadRecurringParent(
  parentTaskId: string,
): Promise<RecurringParentTask | null> {
  const supabase = createServiceClient();
  const { data, error } = await pm(supabase)
    .from("tasks")
    .select(
      "id, project_id, title, priority, assignee_id, section_id, is_recurring, recurrence_rule",
    )
    .eq("id", parentTaskId)
    .maybeSingle();

  if (error) {
    console.error("[loadRecurringParent]", error.message);
    return null;
  }

  return data;
}

async function resolveTodoSectionId(
  projectId: string,
  fallbackSectionId: string | null,
): Promise<string | null> {
  const supabase = createServiceClient();
  const { data, error } = await pm(supabase)
    .from("project_sections")
    .select("id, name, display_order")
    .eq("project_id", projectId)
    .order("display_order", { ascending: true });

  if (error || !data?.length) {
    return fallbackSectionId;
  }

  return findTodoSectionId(data) ?? fallbackSectionId;
}

async function existingInstanceDates(
  parentTaskId: string,
): Promise<Set<string>> {
  const supabase = createServiceClient();
  const { data, error } = await pm(supabase)
    .from("tasks")
    .select("due_date")
    .eq("recurring_parent_id", parentTaskId)
    .eq("is_recurring_instance", true);

  if (error) {
    console.error("[existingInstanceDates]", error.message);
    return new Set();
  }

  return new Set(
    (data ?? [])
      .map((row) => row.due_date)
      .filter((value): value is string => Boolean(value)),
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

export async function syncRecurringInstances(
  teamMemberId: string,
  parentTaskId: string,
): Promise<void> {
  const parent = await loadRecurringParent(parentTaskId);
  if (!parent?.is_recurring) return;

  const rule = parseRecurrenceRule(parent.recurrence_rule);
  if (!rule) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDates = calculateOccurrenceDates(rule, today, INSTANCE_HORIZON_DAYS);
  if (targetDates.length === 0) return;

  const existing = await existingInstanceDates(parent.id);
  const todoSectionId = await resolveTodoSectionId(
    parent.project_id,
    parent.section_id,
  );

  for (const dueDate of targetDates) {
    if (existing.has(dueDate)) continue;
    await createInstance(teamMemberId, parent, dueDate, todoSectionId);
  }
}

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

  const existing = await existingInstanceDates(parent.id);
  if (existing.has(nextDate)) return;

  const todoSectionId = await resolveTodoSectionId(
    parent.project_id,
    parent.section_id,
  );

  await createInstance(teamMemberId, parent, nextDate, todoSectionId);
}
