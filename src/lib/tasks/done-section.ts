import { pm } from "@/lib/supabase/pm";
import type { AppSupabaseClient } from "@/lib/supabase/pm";

export function isDoneSectionName(name: string): boolean {
  const normalized = name.trim().toLowerCase();
  return normalized.includes("done") || normalized.includes("complete");
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

export async function ensureDoneSectionId(
  supabase: AppSupabaseClient,
  projectId: string,
): Promise<string | null> {
  const existing = await findDoneSectionId(supabase, projectId);
  if (existing) return existing;

  const { data: lastSection, error: orderError } = await pm(supabase)
    .from("project_sections")
    .select("display_order")
    .eq("project_id", projectId)
    .order("display_order", { ascending: false })
    .limit(1);

  if (orderError) {
    console.error("[ensureDoneSectionId]", orderError.message);
    return null;
  }

  const { data: created, error: insertError } = await pm(supabase)
    .from("project_sections")
    .insert({
      project_id: projectId,
      name: "Done",
      display_order: (lastSection?.[0]?.display_order ?? -1) + 1,
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("[ensureDoneSectionId] create failed:", insertError.message);
    return null;
  }

  return created?.id ?? null;
}

export function findTodoSectionId(
  sections: Array<{ id: string; name: string }>,
): string | null {
  const todo = sections.find((section) => {
    const normalized = section.name.trim().toLowerCase();
    return normalized === "to do" || normalized === "todo";
  });
  return todo?.id ?? sections[0]?.id ?? null;
}
