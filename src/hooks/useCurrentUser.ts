"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { pm } from "@/lib/supabase/pm";
import { createClient } from "@/lib/supabase/client";
import type { ClientUser, TeamMember } from "@/lib/types";

export type CurrentUserState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "ready"; persona: "team"; user: TeamMember }
  | { status: "ready"; persona: "portal"; user: ClientUser };

export function useCurrentUser(): CurrentUserState {
  const pathname = usePathname() ?? "";
  const [state, setState] = useState<CurrentUserState>({ status: "loading" });

  const load = useCallback(async () => {
    const supabase = createClient();
    const isPortal = pathname.startsWith("/portal");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setState({ status: "anonymous" });
      return;
    }

    if (isPortal) {
      const { data, error } = await pm(supabase)
        .from("client_portal_users")
        .select("*")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (error || !data) {
        setState({ status: "anonymous" });
        return;
      }

      setState({ status: "ready", persona: "portal", user: data });
      return;
    }

    const { data, error } = await pm(supabase)
      .from("team_members")
      .select("*")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (error || !data) {
      setState({ status: "anonymous" });
      return;
    }

    setState({ status: "ready", persona: "team", user: data });
  }, [pathname]);

  useEffect(() => {
    load();

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => subscription.unsubscribe();
  }, [load]);

  return state;
}
