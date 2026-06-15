"use client";

import { Pencil } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateTeamMemberName } from "@/lib/actions/settings";
import { toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";

type TeamMemberNameEditorProps = {
  memberId: string;
  name: string;
  editable: boolean;
  onSaved?: () => void;
};

export function TeamMemberNameEditor({
  memberId,
  name,
  editable,
  onSaved,
}: TeamMemberNameEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [isPending, startTransition] = useTransition();
  const skipBlurSave = useRef(false);

  useEffect(() => {
    if (!isEditing) {
      setDraft(name);
    }
  }, [name, isEditing]);

  function cancelEdit() {
    skipBlurSave.current = true;
    setDraft(name);
    setIsEditing(false);
  }

  function saveEdit() {
    const trimmed = draft.trim();
    if (!trimmed) {
      toastError("Name is required.");
      return;
    }

    if (trimmed === name) {
      cancelEdit();
      return;
    }

    startTransition(async () => {
      const result = await updateTeamMemberName(memberId, trimmed);
      if (result.error) {
        toastError(result.error);
        return;
      }

      toastSuccess("Name updated");
      setIsEditing(false);
      onSaved?.();
    });
  }

  if (!isEditing) {
    return (
      <div className="flex items-center gap-1.5">
        <span>{name}</span>
        {editable ? (
          <button
            type="button"
            aria-label={`Edit name for ${name}`}
            className={cn(
              "rounded p-1 text-muted-foreground transition-colors",
              "hover:bg-muted hover:text-foreground",
            )}
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="size-3.5" />
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            saveEdit();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            cancelEdit();
          }
        }}
        onBlur={() => {
          if (skipBlurSave.current) {
            skipBlurSave.current = false;
            return;
          }
          saveEdit();
        }}
        disabled={isPending}
        className="h-8 max-w-52"
        autoFocus
      />
      <Button
        type="button"
        size="xs"
        disabled={isPending}
        onMouseDown={() => {
          skipBlurSave.current = true;
        }}
        onClick={saveEdit}
      >
        Save
      </Button>
      <Button
        type="button"
        size="xs"
        variant="outline"
        disabled={isPending}
        onMouseDown={() => {
          skipBlurSave.current = true;
        }}
        onClick={cancelEdit}
      >
        Cancel
      </Button>
    </div>
  );
}
