import { Suspense } from "react";
import { PortalShell } from "@/components/portal/portal-shell";
import { PortalShellSkeleton } from "@/components/portal/portal-shell-skeleton";

export default function PortalGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<PortalShellSkeleton>{null}</PortalShellSkeleton>}>
      <PortalShell>{children}</PortalShell>
    </Suspense>
  );
}
