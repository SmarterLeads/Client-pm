"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  signIn,
  signUp,
  type AuthFormState,
} from "@/lib/actions/auth";
import type { UserPersona } from "@/lib/auth/types";
import { toastError, toastSuccess } from "@/lib/toast";

const initialState: AuthFormState = {};

type LoginFormProps = {
  persona: UserPersona;
  title: string;
  description: string;
  allowSignUp?: boolean;
};

export function LoginForm({
  persona,
  title,
  description,
  allowSignUp = false,
}: LoginFormProps) {
  const [signInState, signInAction, signInPending] = useActionState(
    signIn,
    initialState,
  );
  const [signUpState, signUpAction, signUpPending] = useActionState(
    signUp,
    initialState,
  );

  const state = signInState.error || signInState.success ? signInState : signUpState;
  const pending = signInPending || signUpPending;
  const lastError = useRef<string | undefined>(undefined);
  const lastSuccess = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (state.error && state.error !== lastError.current) {
      lastError.current = state.error;
      toastError(state.error);
    }
    if (state.success && state.success !== lastSuccess.current) {
      lastSuccess.current = state.success;
      toastSuccess(state.success);
    }
    if (!state.error) lastError.current = undefined;
    if (!state.success) lastSuccess.current = undefined;
  }, [state.error, state.success]);

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
      </div>

      {state.error ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
          role="status"
        >
          {state.success}
        </p>
      ) : null}

      <form action={signInAction} className="space-y-4">
        <input type="hidden" name="persona" value={persona} />

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      {allowSignUp ? (
        <form action={signUpAction} className="space-y-4 border-t border-zinc-200 pt-6 dark:border-zinc-800">
          <input type="hidden" name="persona" value={persona} />
          <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
            New team member? Create an account
          </p>
          <div className="space-y-2">
            <label htmlFor="signup-email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="signup-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="signup-password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="signup-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            {pending ? "Creating account…" : "Sign up"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
