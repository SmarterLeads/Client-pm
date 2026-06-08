import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

type PortalLoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function PortalLoginPage({
  searchParams,
}: PortalLoginPageProps) {
  const params = await searchParams;
  const callbackError =
    params.error === "auth_callback"
      ? "Email confirmation failed. Try signing in again."
      : params.error === "profile_link"
        ? "No portal account found for this email, or it is not active yet."
        : params.error === "missing_code"
          ? "Invalid confirmation link."
          : undefined;

  return (
    <div className="flex w-full max-w-md flex-col items-center">
      {callbackError ? (
        <p
          className="mb-4 w-full rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
          role="alert"
        >
          {callbackError}
        </p>
      ) : null}
      <LoginForm
        persona="portal"
        title="Client portal"
        description="View your projects, milestones, and updates."
      />
      <p className="mt-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
        Team member?{" "}
        <Link href="/login" className="font-medium underline">
          Internal sign in
        </Link>
      </p>
    </div>
  );
}
