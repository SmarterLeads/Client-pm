"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

type RouteErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
  dashboardHref: string;
  logLabel?: string;
};

export function RouteError({
  error,
  reset,
  dashboardHref,
  logLabel = "RouteError",
}: RouteErrorProps) {
  const isDev = process.env.NODE_ENV === "development";

  useEffect(() => {
    console.error(`[${logLabel}]`, error);
    console.error(`[${logLabel}] message:`, error.message);
    console.error(`[${logLabel}] stack:`, error.stack);
    if (error.digest) {
      console.error(`[${logLabel}] digest:`, error.digest);
    }
  }, [error, logLabel]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-xl font-semibold tracking-tight">
        Something went wrong
      </h2>
      <p className="max-w-md text-sm text-muted-foreground">
        We hit an unexpected error. You can try again or return to your
        dashboard.
      </p>
      {isDev ? (
        <pre className="max-w-2xl overflow-x-auto rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-left text-xs whitespace-pre-wrap text-destructive">
          {error.message}
          {error.stack ? `\n\n${error.stack}` : ""}
        </pre>
      ) : null}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
        <Button render={<Link href={dashboardHref} />} variant="outline">
          Go to dashboard
        </Button>
      </div>
    </div>
  );
}

