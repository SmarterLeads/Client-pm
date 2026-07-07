import { NextRequest, NextResponse } from "next/server";

import { isBlockedPmEmail } from "@/lib/auth/blocked-emails";
import { getPublicClientUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/** Signs out blocked sessions and sends the user to login with an error message. */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && (isBlockedPmEmail(user.email) || (await getPublicClientUser(user.id)))) {
    await supabase.auth.signOut();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("error", "access_denied");
  return NextResponse.redirect(url);
}
