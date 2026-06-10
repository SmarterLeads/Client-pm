"use client";

import { useState, useTransition } from "react";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { EditMeetingSheet } from "@/components/internal/meeting-sheets";
import { RichTextDisplay } from "@/components/shared/rich-text-display";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteMeeting } from "@/lib/actions/internal";
import type { MeetingListRow } from "@/lib/queries/internal";
import {
  meetingTypeLabels,
  meetingVisibilityLabels,
  type MeetingType,
  type MeetingVisibility,
} from "@/lib/types/internal";
import type { TeamMember } from "@/lib/types";
import { toastError, toastSuccess } from "@/lib/toast";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function meetingTypeBadgeClass(type: MeetingType) {
  switch (type) {
    case "standup":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300";
    case "one_on_one":
      return "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-300";
    case "planning":
      return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300";
    default:
      return "";
  }
}

function MeetingTimelineItem({
  meeting,
  teamMembers,
  currentUserId,
  isAdmin,
}: {
  meeting: MeetingListRow;
  teamMembers: Pick<TeamMember, "id" | "name">[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [isDeleting, startDelete] = useTransition();
  const canManage =
    isAdmin || meeting.created_by === currentUserId;

  function handleDelete() {
    if (
      !window.confirm(
        "Delete this meeting log? This cannot be undone.",
      )
    ) {
      return;
    }

    startDelete(async () => {
      const result = await deleteMeeting(meeting.id, meeting.created_by);
      if (result.error) {
        toastError(result.error);
        return;
      }
      toastSuccess("Meeting deleted");
      router.refresh();
    });
  }

  return (
    <>
      <article className="relative border-l-2 border-border pb-8 pl-6 last:pb-0">
        <span className="absolute -left-[5px] top-1.5 size-2 rounded-full bg-primary" />

        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={meetingTypeBadgeClass(meeting.type)}
                >
                  {meetingTypeLabels[meeting.type]}
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <Eye className="size-3" aria-hidden />
                  {meetingVisibilityLabels[meeting.visibility as MeetingVisibility]}
                </Badge>
              </div>
              <h2 className="text-base font-semibold">{meeting.title}</h2>
              {meeting.summary ? (
                <RichTextDisplay className="text-muted-foreground">
                  {meeting.summary}
                </RichTextDisplay>
              ) : null}
            </div>

            {canManage ? (
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Edit meeting"
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Delete meeting"
                  disabled={isDeleting}
                  onClick={handleDelete}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <time dateTime={meeting.occurred_at}>
              {formatDateTime(meeting.occurred_at)}
            </time>
            <span>·</span>
            <span>Logged by {meeting.creator_name ?? "Unknown"}</span>
          </div>

          {meeting.participants.length > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Participants</span>
              <div className="flex -space-x-2">
                {meeting.participants.slice(0, 6).map((participant) => (
                  <Avatar key={participant.id} size="sm" className="ring-2 ring-background">
                    {participant.avatar_url ? (
                      <AvatarImage src={participant.avatar_url} alt="" />
                    ) : null}
                    <AvatarFallback>{initials(participant.name)}</AvatarFallback>
                  </Avatar>
                ))}
              </div>
              {meeting.participants.length > 6 ? (
                <span className="text-xs text-muted-foreground">
                  +{meeting.participants.length - 6}
                </span>
              ) : null}
            </div>
          ) : null}

          {meeting.body ? (
            <div>
              <button
                type="button"
                className="text-sm font-medium text-primary hover:underline"
                onClick={() => setExpanded((value) => !value)}
              >
                {expanded ? "Hide notes" : "Show notes"}
              </button>
              {expanded ? (
                <RichTextDisplay className="mt-2 text-muted-foreground">
                  {meeting.body}
                </RichTextDisplay>
              ) : null}
            </div>
          ) : null}
        </div>
      </article>

      <EditMeetingSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        meeting={meeting}
        teamMembers={teamMembers}
        canEdit={canManage}
        onUpdated={() => router.refresh()}
      />
    </>
  );
}

export function MeetingsTimeline({
  meetings,
  teamMembers,
  currentUserId,
  isAdmin,
}: {
  meetings: MeetingListRow[];
  teamMembers: Pick<TeamMember, "id" | "name">[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  if (meetings.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
        No meetings logged yet.
      </p>
    );
  }

  return (
    <div className="space-y-0">
      {meetings.map((meeting) => (
        <MeetingTimelineItem
          key={meeting.id}
          meeting={meeting}
          teamMembers={teamMembers}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
        />
      ))}
    </div>
  );
}
