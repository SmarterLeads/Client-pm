"use client";

import { useActionState, useEffect, useState } from "react";
import { createMeeting, type InternalFormState } from "@/lib/actions/internal";
import { useActionToast } from "@/hooks/use-action-toast";
import { RichTextEditor } from "@/components/shared/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  SheetFormActions,
  SheetFormBody,
  SheetFormField,
  sheetInputClassName,
  sheetSelectClassName,
} from "@/components/ui/sheet-form";
import {
  MeetingTypes,
  MeetingVisibilities,
  meetingTypeLabels,
  meetingVisibilityLabels,
} from "@/lib/types/internal";
import type { TeamMember } from "@/lib/types";

const initialState: InternalFormState = {};

function defaultDateTimeLocal() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

type LogMeetingSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamMembers: Pick<TeamMember, "id" | "name">[];
};

export function LogMeetingSheet({
  open,
  onOpenChange,
  teamMembers,
}: LogMeetingSheetProps) {
  const [state, formAction, pending] = useActionState(createMeeting, initialState);
  const [occurredAt, setOccurredAt] = useState(defaultDateTimeLocal);
  const [body, setBody] = useState("");

  useActionToast(state, {
    successMessage: "Meeting logged",
    onSuccess: () => onOpenChange(false),
  });

  useEffect(() => {
    if (open) {
      setOccurredAt(defaultDateTimeLocal());
      setBody("");
    }
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-[520px]">
        <SheetHeader>
          <SheetTitle>Log meeting</SheetTitle>
        </SheetHeader>

        <form action={formAction} className="flex min-h-0 flex-1 flex-col">
          <SheetBody className="py-0">
            <SheetFormBody>
              {state.error ? (
                <p className="text-sm text-destructive" role="alert">
                  {state.error}
                </p>
              ) : null}

              <SheetFormField
                label="Title"
                required
                error={state.fieldErrors?.title?.[0]}
              >
                <Input name="title" required className={sheetInputClassName} />
              </SheetFormField>

              <SheetFormField label="Type" error={state.fieldErrors?.type?.[0]}>
                <select
                  name="type"
                  defaultValue="team_meeting"
                  className={sheetSelectClassName}
                >
                  {MeetingTypes.map((type) => (
                    <option key={type} value={type}>
                      {meetingTypeLabels[type]}
                    </option>
                  ))}
                </select>
              </SheetFormField>

              <SheetFormField
                label="Occurred at"
                required
                error={state.fieldErrors?.occurred_at?.[0]}
              >
                <Input
                  name="occurred_at"
                  type="datetime-local"
                  required
                  value={occurredAt}
                  onChange={(event) => setOccurredAt(event.target.value)}
                  className={sheetInputClassName}
                />
              </SheetFormField>

              <SheetFormField
                label="Summary"
                error={state.fieldErrors?.summary?.[0]}
              >
                <Input name="summary" className={sheetInputClassName} />
              </SheetFormField>

              <SheetFormField label="Body" error={state.fieldErrors?.body?.[0]}>
                <RichTextEditor
                  name="body"
                  value={body}
                  onChange={setBody}
                  placeholder="Detailed notes…"
                />
              </SheetFormField>

              <SheetFormField label="Participants">
                <select
                  name="participant_ids"
                  multiple
                  className={`${sheetSelectClassName} min-h-28`}
                >
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-muted-foreground">
                  Hold Ctrl/Cmd to select multiple.
                </p>
              </SheetFormField>

              <SheetFormField
                label="Visibility"
                error={state.fieldErrors?.visibility?.[0]}
              >
                <select
                  name="visibility"
                  defaultValue="all"
                  className={sheetSelectClassName}
                >
                  {MeetingVisibilities.map((value) => (
                    <option key={value} value={value}>
                      {meetingVisibilityLabels[value]}
                    </option>
                  ))}
                </select>
              </SheetFormField>
            </SheetFormBody>
          </SheetBody>

          <SheetFooter>
            <SheetFormActions
              primaryLabel="Log meeting"
              pending={pending}
              onCancel={() => onOpenChange(false)}
            />
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

type EditMeetingSheetProps = LogMeetingSheetProps & {
  meeting: {
    id: string;
    title: string;
    type: string;
    summary: string | null;
    body: string | null;
    occurred_at: string;
    visibility: string;
    created_by: string;
    participants: { id: string; team_member_id: string }[];
  };
  canEdit: boolean;
  onUpdated: () => void;
};

export function EditMeetingSheet({
  open,
  onOpenChange,
  meeting,
  teamMembers,
  canEdit,
  onUpdated,
}: EditMeetingSheetProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState(meeting.body ?? "");

  useEffect(() => {
    if (open) {
      setBody(meeting.body ?? "");
    }
  }, [open, meeting.body]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit) return;

    const formData = new FormData(event.currentTarget);
    setPending(true);
    setError(null);

    const { updateMeeting } = await import("@/lib/actions/internal");
    const occurredAtRaw = String(formData.get("occurred_at") ?? "");
    const result = await updateMeeting(meeting.id, meeting.created_by, {
      title: formData.get("title"),
      type: formData.get("type"),
      summary: formData.get("summary"),
      body,
      visibility: formData.get("visibility"),
      occurred_at: occurredAtRaw
        ? new Date(occurredAtRaw).toISOString()
        : meeting.occurred_at,
    });

    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }

    onUpdated();
    onOpenChange(false);
  }

  const occurredLocal = meeting.occurred_at
    ? new Date(meeting.occurred_at).toISOString().slice(0, 16)
    : defaultDateTimeLocal();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-[520px]">
        <SheetHeader>
          <SheetTitle>Edit meeting</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <SheetBody className="py-0">
            <SheetFormBody>
              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}

              <SheetFormField label="Title" required>
                <Input
                  name="title"
                  required
                  defaultValue={meeting.title}
                  disabled={!canEdit}
                  className={sheetInputClassName}
                />
              </SheetFormField>

              <SheetFormField label="Type">
                <select
                  name="type"
                  defaultValue={meeting.type}
                  disabled={!canEdit}
                  className={sheetSelectClassName}
                >
                  {MeetingTypes.map((type) => (
                    <option key={type} value={type}>
                      {meetingTypeLabels[type]}
                    </option>
                  ))}
                </select>
              </SheetFormField>

              <SheetFormField label="Occurred at" required>
                <Input
                  name="occurred_at"
                  type="datetime-local"
                  required
                  defaultValue={occurredLocal}
                  disabled={!canEdit}
                  className={sheetInputClassName}
                />
              </SheetFormField>

              <SheetFormField label="Summary">
                <Input
                  name="summary"
                  defaultValue={meeting.summary ?? ""}
                  disabled={!canEdit}
                  className={sheetInputClassName}
                />
              </SheetFormField>

              <SheetFormField label="Body">
                <RichTextEditor
                  value={body}
                  onChange={setBody}
                  disabled={!canEdit}
                  placeholder="Detailed notes…"
                />
              </SheetFormField>

              <SheetFormField label="Visibility">
                <select
                  name="visibility"
                  defaultValue={meeting.visibility}
                  disabled={!canEdit}
                  className={sheetSelectClassName}
                >
                  {MeetingVisibilities.map((value) => (
                    <option key={value} value={value}>
                      {meetingVisibilityLabels[value]}
                    </option>
                  ))}
                </select>
              </SheetFormField>

              <SheetFormField label="Participants">
                <p className="text-sm text-muted-foreground">
                  {meeting.participants.length > 0
                    ? meeting.participants
                        .map(
                          (participant) =>
                            teamMembers.find(
                              (member) =>
                                member.id === participant.team_member_id,
                            )?.name ?? "Unknown",
                        )
                        .join(", ")
                    : "None selected"}
                </p>
              </SheetFormField>
            </SheetFormBody>
          </SheetBody>

          {canEdit ? (
            <SheetFooter>
              <SheetFormActions
                primaryLabel="Save changes"
                pending={pending}
                onCancel={() => onOpenChange(false)}
              />
            </SheetFooter>
          ) : (
            <SheetFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </SheetFooter>
          )}
        </form>
      </SheetContent>
    </Sheet>
  );
}
