"use client";

import { useState } from "react";
import { LogMeetingSheet } from "@/components/internal/meeting-sheets";
import { MeetingsTimeline } from "@/components/internal/meetings-timeline";
import { Button } from "@/components/ui/button";
import type { MeetingListRow } from "@/lib/queries/internal";
import type { TeamMember } from "@/lib/types";

type MeetingsPageClientProps = {
  meetings: MeetingListRow[];
  teamMembers: Pick<TeamMember, "id" | "name">[];
  currentUserId: string;
  isAdmin: boolean;
};

export function MeetingsPageClient({
  meetings,
  teamMembers,
  currentUserId,
  isAdmin,
}: MeetingsPageClientProps) {
  const [logOpen, setLogOpen] = useState(false);

  return (
    <>
      <div className="flex justify-end">
        <Button type="button" onClick={() => setLogOpen(true)}>
          Log meeting
        </Button>
      </div>

      <MeetingsTimeline
        meetings={meetings}
        teamMembers={teamMembers}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
      />

      <LogMeetingSheet
        open={logOpen}
        onOpenChange={setLogOpen}
        teamMembers={teamMembers}
      />
    </>
  );
}
