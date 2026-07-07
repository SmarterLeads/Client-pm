import { NextResponse } from "next/server";
import {
  ensureClientUserLinked,
  ensureTeamMember,
} from "@/lib/auth/profiles";
import { isBlockedPmEmail } from "@/lib/auth/blocked-emails";
import type { UserPersona } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const persona = (searchParams.get("persona") ?? "team") as UserPersona;
  const next = searchParams.get("next");

  if (!code) {
    return NextResponse.redirect(
      `${origin}${persona === "portal" ? "/portal/login" : "/login"}?error=missing_code`,
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user?.email) {
    return NextResponse.redirect(
      `${origin}${persona === "portal" ? "/portal/login" : "/login"}?error=auth_callback`,
    );
  }

  const email = data.user.email;

  if (isBlockedPmEmail(email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/auth/access-denied`);
  }

  const { data: publicClientUser } = await supabase
    .from("client_users")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (publicClientUser && persona === "team") {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/auth/access-denied`);
  }

  try {
    if (persona === "portal") {
      await ensureClientUserLinked(data.user.id, email);
      const destination = next?.startsWith("/portal")
        ? next
        : "/portal/dashboard";
      return NextResponse.redirect(`${origin}${destination}`);
    }

    await ensureTeamMember(
      data.user.id,
      email,
      data.user.user_metadata?.full_name ?? data.user.user_metadata?.name,
    );
    const destination =
      next && isAppCallbackPath(next) ? next : "/dashboard";
    return NextResponse.redirect(`${origin}${destination}`);
  } catch {
    await supabase.auth.signOut();
    return NextResponse.redirect(
      `${origin}${persona === "portal" ? "/portal/login" : "/login"}?error=profile_link`,
    );
  }
}

function isAppCallbackPath(path: string) {
  return (
    path.startsWith("/dashboard") ||
    path.startsWith("/clients") ||
    path.startsWith("/projects") ||
    path.startsWith("/tasks") ||
    path.startsWith("/team") ||
    path.startsWith("/settings") ||
    path.startsWith("/history")
  );
}
