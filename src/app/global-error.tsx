"use client";

import Link from "next/link";
import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-full flex-col antialiased">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <h2 className="text-xl font-semibold tracking-tight">
            Application error
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            A critical error occurred. Please try again or return to the home
            page.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              Try again
            </button>
            <Link
              href="/dashboard"
              className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted"
            >
              Go to dashboard
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
