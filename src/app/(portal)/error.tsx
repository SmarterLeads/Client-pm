"use client";

import { RouteError } from "@/components/shared/route-error";

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      error={error}
      reset={reset}
      dashboardHref="/portal/dashboard"
    />
  );
}
