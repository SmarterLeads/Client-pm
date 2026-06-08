"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PortalAccessLevelBadge } from "@/components/portal/portal-access-level-badge";
import { PortalInviteSheet } from "@/components/clients/portal-invite-sheet";
import { revokePortalUser } from "@/lib/actions/portal";
import { toastError, toastSuccess } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ClientUser } from "@/lib/types";

type PortalUsersSectionProps = {
  clientId: string;
  portalUsers: ClientUser[];
};

function formatLastLogin(iso: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function PortalUsersSection({
  clientId,
  portalUsers,
}: PortalUsersSectionProps) {
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function handleRevoke(userId: string, label: string) {
    const confirmed = window.confirm(
      `Revoke portal access for ${label}? They will no longer be able to sign in.`,
    );
    if (!confirmed) return;

    setError(null);
    setPendingId(userId);

    const result = await revokePortalUser(clientId, userId);
    setPendingId(null);

    if (result.error) {
      setError(result.error);
      toastError(result.error);
      return;
    }

    toastSuccess("Portal access revoked");

    startTransition(() => router.refresh());
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle>Portal users</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setInviteOpen(true)}
          >
            Invite to portal
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          {portalUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No portal users yet. Invite a client contact to give them access.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {portalUsers.map((user) => {
                const label = user.name ?? user.email;

                return (
                  <li
                    key={user.id}
                    className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium">{label}</p>
                      {user.name ? (
                        <p className="truncate text-sm text-muted-foreground">
                          {user.email}
                        </p>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-2">
                        <PortalAccessLevelBadge accessLevel={user.access_level} />
                        <Badge variant={user.is_active ? "outline" : "secondary"}>
                          {user.is_active ? "Active" : "Revoked"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Last login: {formatLastLogin(user.last_login)}
                        </span>
                      </div>
                    </div>

                    {user.is_active ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pendingId === user.id}
                        onClick={() => void handleRevoke(user.id, label)}
                      >
                        Revoke access
                      </Button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <PortalInviteSheet
        clientId={clientId}
        open={inviteOpen}
        onOpenChange={setInviteOpen}
      />
    </>
  );
}
