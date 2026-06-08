import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const callbackError =
    params.error === "auth_callback"
      ? "Email confirmation failed. Try signing in again."
      : params.error === "profile_link"
        ? "Could not link your account. Contact an administrator."
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
        persona="team"
        title="Team sign in"
        description="Sign in to the internal project management app."
        allowSignUp
      />
      <p className="mt-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
        Client portal?{" "}
        <Link href="/portal/login" className="font-medium underline">
          Sign in here
        </Link>
      </p>
    </div>
  );
}
