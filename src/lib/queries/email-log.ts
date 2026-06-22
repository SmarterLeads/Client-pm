import { pm } from "@/lib/supabase/pm";
import { createClient } from "@/lib/supabase/server";
import type { EmailLog } from "@/lib/types";

export async function getPendingEmailLogs(limit = 50): Promise<EmailLog[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await pm(supabase)
      .from("email_log")
      .select("*")
      .eq("status", "pending")
      .order("received_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("getPendingEmailLogs:", error.message);
      return [];
    }

    return data ?? [];
  } catch (err) {
    console.error(
      "getPendingEmailLogs:",
      err instanceof Error ? err.message : err,
    );
    return [];
  }
}

export async function getPendingEmailLogCount(): Promise<number> {
  try {
    const supabase = await createClient();

    const { count, error } = await pm(supabase)
      .from("email_log")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");

    if (error) {
      console.error("getPendingEmailLogCount:", error.message);
      return 0;
    }

    return count ?? 0;
  } catch (err) {
    console.error(
      "getPendingEmailLogCount:",
      err instanceof Error ? err.message : err,
    );
    return 0;
  }
}

export async function getEmailLogById(
  emailLogId: string,
): Promise<EmailLog | null> {
  const supabase = await createClient();

  const { data, error } = await pm(supabase)
    .from("email_log")
    .select("*")
    .eq("id", emailLogId)
    .maybeSingle();

  if (error) {
    console.error("getEmailLogById:", error.message);
    return null;
  }

  return data;
}
