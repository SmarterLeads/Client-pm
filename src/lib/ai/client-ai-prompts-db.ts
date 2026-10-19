import { supabasePM } from "@/lib/supabase-pm";

export type ClientAiPrompt = {
  id: string;
  client_id: string;
  name: string;
  platform: string;
  prompt_text: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

// Table exists in pm schema; add to generated database.ts after migration.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pmTable = (name: string) => (supabasePM as any).from(name);

export async function listClientAiPrompts(
  clientId: string,
): Promise<{ data: ClientAiPrompt[] | null; error: string | null }> {
  const { data, error } = await pmTable("client_ai_prompts")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  return { data: data as ClientAiPrompt[] | null, error: error?.message ?? null };
}

export async function getDefaultClientAiPrompt(
  clientId: string,
  platform: string,
): Promise<ClientAiPrompt | null> {
  const { data } = await pmTable("client_ai_prompts")
    .select("*")
    .eq("client_id", clientId)
    .eq("platform", platform)
    .eq("is_default", true)
    .maybeSingle();
  return (data as ClientAiPrompt | null) ?? null;
}

export { pmTable as clientAiPromptsTable };
