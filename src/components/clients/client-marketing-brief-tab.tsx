"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { updateMarketingBrief } from "@/lib/actions/clients";
import { toastError, toastSuccess } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type ClientMarketingBriefTabProps = {
  clientId: string;
  brief: string | null;
};

export function ClientMarketingBriefTab({
  clientId,
  brief,
}: ClientMarketingBriefTabProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(brief ?? "");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!isEditing) {
      setDraft(brief ?? "");
    }
  }, [brief, isEditing]);

  const hasBrief = Boolean(brief?.trim());

  function handleCancel() {
    setDraft(brief ?? "");
    setIsEditing(false);
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateMarketingBrief(clientId, draft);
      if (result.error) {
        toastError(result.error);
        return;
      }
      toastSuccess("Marketing brief saved");
      setIsEditing(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Marketing Brief
          </h2>
          <p className="text-sm text-muted-foreground">
            Internal notes on positioning, goals, and campaign context for this
            client.
          </p>
        </div>
        {!isEditing ? (
          <Button type="button" variant="outline" onClick={() => setIsEditing(true)}>
            Edit
          </Button>
        ) : null}
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add campaign goals, audience notes, messaging, budget context…"
            rows={16}
            disabled={isPending}
            className="min-h-64 font-mono text-sm leading-relaxed"
            aria-label="Marketing brief"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={handleSave} disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : hasBrief ? (
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{brief}</p>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border px-4 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No marketing brief yet — click Edit to add one
          </p>
        </div>
      )}
    </div>
  );
}
