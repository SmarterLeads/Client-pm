"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";
import {
  ensureClientUserLinked,
  ensureTeamMember,
} from "@/lib/auth/profiles";
import { isBlockedPmEmail } from "@/lib/auth/blocked-emails";
import type { UserPersona } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = {
  error?: string;
  success?: string;
};

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function getPersona(formData: FormData): UserPersona {
  return formData.get("persona") === "portal" ? "portal" : "team";
}

export async function signIn(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const persona = getPersona(formData);

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  if (isBlockedPmEmail(email)) {
    return { error: "Your account does not have access to this application." };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  console.log("[signIn] Supabase URL:", supabaseUrl);
  console.log("[signIn] signInWithPassword attempt:", { email, persona });

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  console.log("[signIn] signInWithPassword result:", {
    userId: data?.user?.id ?? null,
    hasSession: Boolean(data?.session),
    error: error
      ? {
          message: error.message,
          status: error.status,
          name: error.name,
          code: error.code,
        }
      : null,
  });

  if (error) {
    console.log("[signIn] signInWithPassword error:", error.message);
    return { error: error.message };
  }

  if (!data.user) {
    console.log("[signIn] signInWithPassword returned no user");
    return { error: "Sign in failed. Please try again." };
  }

  if (isBlockedPmEmail(data.user.email)) {
    await supabase.auth.signOut();
    return { error: "Your account does not have access to this application." };
  }

  try {
    if (persona === "team") {
      console.log("[signIn] calling ensureTeamMember for:", data.user.id);
      await ensureTeamMember(
        data.user.id,
        email,
        data.user.user_metadata?.full_name ?? data.user.user_metadata?.name,
      );
      console.log("[signIn] ensureTeamMember succeeded");
    } else {
      await ensureClientUserLinked(data.user.id, email);
    }
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("[signIn] profile link failed:", err);
    await supabase.auth.signOut();
    return {
      error:
        err instanceof Error ? err.message : "Unable to complete sign in.",
    };
  }

  console.log(
    "[signIn] redirecting to",
    persona === "team" ? "/dashboard" : "/portal/dashboard",
  );
  redirect(persona === "team" ? "/dashboard" : "/portal/dashboard");
}

export async function signUp(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const persona = getPersona(formData);

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  if (persona === "portal") {
    return {
      error:
        "Portal accounts are created by invitation. Contact your account manager.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getAppUrl()}/auth/callback?persona=team`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success:
      "Check your email to confirm your account, then sign in.",
  };
}

export async function signOut(formData: FormData) {
  const persona = getPersona(formData);
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(persona === "portal" ? "/portal/login" : "/login");
}
