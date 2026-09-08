import { pm } from "@/lib/supabase/pm";
import type { AppSupabaseClient } from "@/lib/supabase/pm";

const DONE_SECTION_NAMES = new Set(["done", "completed", "complete"]);

export function isDoneSectionName(name: string): boolean {
  return DONE_SECTION_NAMES.has(name.trim().toLowerCase());
}

export async function findDoneSectionId(
  supabase: AppSupabaseClient,
  projectId: string,
): Promise<string | null> {
  const { data, error } = await pm(supabase)
    .from("project_sections")
    .select("id, name")
    .eq("project_id", projectId);

  if (error) {
    console.error("[findDoneSectionId]", error.message);
    return null;
  }

  const done = (data ?? []).find((section) => isDoneSectionName(section.name));
  return done?.id ?? null;
}

export function findTodoSectionId(
  sections: Array<{ id: string; name: string }>,
): string | null {
  const todo = sections.find(
    (section) => section.name.trim().toLowerCase() === "to do",
  );
  return todo?.id ?? sections[0]?.id ?? null;
}
