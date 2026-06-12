"use client";

import { useState } from "react";
import { CredentialCard } from "@/components/clients/credential-card";
import { CredentialFormSheet } from "@/components/clients/credential-form-sheet";
import { Button } from "@/components/ui/button";
import type { ClientCredentialsResult } from "@/lib/credentials/types";

type ClientAccessTabProps = {
  clientId: string;
  access: ClientCredentialsResult;
};

export function ClientAccessTab({ clientId, access }: ClientAccessTabProps) {
  const [addOpen, setAddOpen] = useState(false);

  if (!access.canView) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
        You don&apos;t have permission to view access credentials for this
        client.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
        <p className="font-medium">
          🔒 Sensitive information — only visible to admins and the account
          manager.
        </p>
        <p className="mt-1 text-amber-900/90 dark:text-amber-100/90">
          Do not store critical production passwords here. Credentials are saved
          as plain text in the database.
        </p>
      </div>

      <div className="flex items-center justify-end">
        <Button type="button" onClick={() => setAddOpen(true)}>
          Add credentials
        </Button>
      </div>

      {access.credentials.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
          No credentials saved yet.
        </p>
      ) : (
        <div className="grid gap-4">
          {access.credentials.map((credential) => (
            <CredentialCard
              key={credential.id}
              clientId={clientId}
              credential={credential}
            />
          ))}
        </div>
      )}

      <CredentialFormSheet
        clientId={clientId}
        open={addOpen}
        onOpenChange={setAddOpen}
      />
    </div>
  );
}
