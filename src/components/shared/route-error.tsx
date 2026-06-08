"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

type RouteErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
  dashboardHref: string;
};

export function RouteError({ error, reset, dashboardHref }: RouteErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-xl font-semibold tracking-tight">
        Something went wrong
      </h2>
      <p className="max-w-md text-sm text-muted-foreground">
        We hit an unexpected error. You can try again or return to your
        dashboard.
      </p>
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
