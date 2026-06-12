"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { updateMarketingBrief } from "@/lib/actions/clients";
import { toastError, toastSuccess } from "@/lib/toast";
import { RichTextDisplay } from "@/components/shared/rich-text-display-lazy";
import { RichTextEditor } from "@/components/shared/rich-text-editor";
import { Button } from "@/components/ui/button";
import { normalizeRichTextHtml, prepareRichTextForEditor } from "@/lib/rich-text";

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
  const [editSession, setEditSession] = useState(0);
  const [draft, setDraft] = useState(() => prepareRichTextForEditor(brief ?? ""));
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!isEditing) {
      setDraft(prepareRichTextForEditor(brief ?? ""));
    }
  }, [brief, isEditing]);

  const hasBrief = Boolean(brief?.trim());

  function handleEdit() {
    setDraft(prepareRichTextForEditor(brief ?? ""));
    setEditSession((session) => session + 1);
    setIsEditing(true);
  }

  function handleCancel() {
    setDraft(prepareRichTextForEditor(brief ?? ""));
    setIsEditing(false);
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateMarketingBrief(
        clientId,
        normalizeRichTextHtml(draft),
      );
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
          <Button type="button" variant="outline" onClick={handleEdit}>
            Edit
          </Button>
        ) : null}
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <RichTextEditor
            key={`marketing-brief-edit-${editSession}`}
            value={draft}
            onChange={setDraft}
            placeholder="Add campaign goals, audience notes, messaging, budget context…"
            minHeightClassName="min-h-64"
            disabled={isPending}
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
          <RichTextDisplay>{brief!}</RichTextDisplay>
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
