import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

export type AppSupabaseClient = SupabaseClient<Database>;

/** PM tables, views, and RPCs live in the `pm` schema. */
export function pm(client: AppSupabaseClient) {
  return client.schema("pm");
}

type PmRpcResult<T> = Promise<{
  data: T | null;
  error: { message: string } | null;
}>;

type PublicRpcClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => PmRpcResult<unknown>;
};

/** Team-context RPCs live in `public` (see supabase/migrations/*_rpcs.sql). */
export function pmRpc<T = unknown>(
  client: AppSupabaseClient,
  fn: string,
  args: Record<string, unknown>,
): PmRpcResult<T> {
  return (client as unknown as PublicRpcClient).rpc(fn, args) as PmRpcResult<T>;
}
