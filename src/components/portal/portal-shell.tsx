import { redirect } from "next/navigation";
import { PortalNav } from "@/components/portal/portal-nav";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { getPortalSession } from "@/lib/auth/session";

export async function PortalShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getPortalSession();

  if (!session) {
    redirect("/portal/login");
  }

  const { clientUser, client } = session;
  const companyLabel = client.name;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <header className="border-b border-border bg-card/50 px-4 py-4 md:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Client portal
            </p>
            <h1 className="text-lg font-semibold tracking-tight md:text-xl">
              {companyLabel}
            </h1>
            {clientUser.name ? (
              <p className="text-sm text-muted-foreground">{clientUser.name}</p>
            ) : null}
          </div>
          <SignOutButton persona="portal" />
        </div>
        <div className="mt-4">
          <PortalNav />
        </div>
      </header>
      <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
    </div>
  );
}
