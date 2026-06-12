"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { CredentialFormSheet } from "@/components/clients/credential-form-sheet";
import { Button } from "@/components/ui/button";
import { deleteCredential } from "@/lib/actions/credentials";
import type { ClientCredentialRow } from "@/lib/credentials/types";
import { toastError, toastSuccess } from "@/lib/toast";

function formatCredentialDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function CredentialCard({
  clientId,
  credential,
}: {
  clientId: string;
  credential: ClientCredentialRow;
}) {
  const router = useRouter();
  const [revealed, setRevealed] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [isDeleting, startDelete] = useTransition();

  function handleDelete() {
    if (
      !window.confirm(
        `Delete credentials for ${credential.platform}? This cannot be undone.`,
      )
    ) {
      return;
    }

    startDelete(async () => {
      const result = await deleteCredential(clientId, credential.id);
      if (result.error) {
        toastError(result.error);
        return;
      }
      toastSuccess("Credentials deleted");
      router.refresh();
    });
  }

  return (
    <>
      <article className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <h3 className="font-semibold tracking-tight">{credential.platform}</h3>

            {credential.url ? (
              <p className="text-sm">
                <a
                  href={credential.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {credential.url}
                </a>
              </p>
            ) : null}

            {credential.username ? (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Username:</span>{" "}
                {credential.username}
              </p>
            ) : null}

            {credential.password ? (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">Password:</span>
                <span className="font-mono text-muted-foreground">
                  {revealed ? credential.password : "••••••••"}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => setRevealed((value) => !value)}
                >
                  {revealed ? (
                    <>
                      <EyeOff className="size-3.5" />
                      Hide
                    </>
                  ) : (
                    <>
                      <Eye className="size-3.5" />
                      Reveal
                    </>
                  )}
                </Button>
              </div>
            ) : null}

            {credential.notes ? (
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                {credential.notes}
              </p>
            ) : null}

            <p className="text-xs text-muted-foreground">
              {credential.created_by_name
                ? `Added by ${credential.created_by_name}`
                : "Added"}
              {" · "}
              <time dateTime={credential.created_at}>
                {formatCredentialDate(credential.created_at)}
              </time>
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Edit credentials"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Delete credentials"
              disabled={isDeleting}
              onClick={handleDelete}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      </article>

      <CredentialFormSheet
        clientId={clientId}
        open={editOpen}
        onOpenChange={setEditOpen}
        credential={credential}
      />
    </>
  );
}
