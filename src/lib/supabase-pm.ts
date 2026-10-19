import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
  );
}

const serviceClient = createClient<Database>(url, key, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/** Service-role client scoped to the `pm` schema (server-only). */
export const supabasePM = serviceClient.schema("pm");
