import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  isAppProtectedPath,
  isPortalProtectedPath,
} from "@/lib/auth/constants";
import { isBlockedPmEmail } from "@/lib/auth/blocked-emails";
import { pm } from "@/lib/supabase/pm";
import type { Database } from "@/lib/types/database";

const ACCESS_DENIED_PATH = "/auth/access-denied";

function isAuthExemptPath(pathname: string): boolean {
  return (
    pathname === ACCESS_DENIED_PATH ||
    pathname === "/auth/callback" ||
    pathname.startsWith("/auth/callback/")
  );
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLogin = pathname === "/login";
  const isPortalLogin = pathname === "/portal/login";
  const appProtected = isAppProtectedPath(pathname);
  const portalProtected = isPortalProtectedPath(pathname);

  if (!user) {
    if (appProtected) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    if (portalProtected) {
      const url = request.nextUrl.clone();
      url.pathname = "/portal/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  const { data: publicClientUser } = await supabase
    .from("client_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (publicClientUser && !isAuthExemptPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = ACCESS_DENIED_PATH;
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (isBlockedPmEmail(user.email)) {
    if (pathname !== ACCESS_DENIED_PATH) {
      const url = request.nextUrl.clone();
      url.pathname = ACCESS_DENIED_PATH;
      url.search = "";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  const [{ data: teamMember }, { data: clientPortalUser }] = await Promise.all([
    pm(supabase)
      .from("team_members")
      .select("id, email")
      .eq("auth_user_id", user.id)
      .maybeSingle(),
    pm(supabase)
      .from("client_portal_users")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle(),
  ]);

  if (isBlockedPmEmail(teamMember?.email)) {
    if (pathname !== ACCESS_DENIED_PATH) {
      const url = request.nextUrl.clone();
      url.pathname = ACCESS_DENIED_PATH;
      url.search = "";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  const isTeam = Boolean(teamMember);
  const isPortal = Boolean(clientPortalUser);

  if (isLogin && isTeam && !isBlockedPmEmail(user.email)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (isPortalLogin && isPortal) {
    const url = request.nextUrl.clone();
    url.pathname = "/portal/dashboard";
    return NextResponse.redirect(url);
  }

  if (appProtected && !isTeam) {
    const url = request.nextUrl.clone();
    url.pathname = isPortal ? "/portal/dashboard" : "/login";
    return NextResponse.redirect(url);
  }

  if (portalProtected && !isPortal) {
    const url = request.nextUrl.clone();
    url.pathname = isTeam ? "/dashboard" : "/portal/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
