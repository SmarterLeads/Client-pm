import { Suspense } from "react";
import { MeetingsFilters } from "@/components/internal/meetings-filters";
import { MeetingsPageClient } from "@/components/internal/meetings-page-client";
import { Skeleton } from "@/components/ui/skeleton";
import { getTeamMember } from "@/lib/auth/session";
import {
  getMeetings,
  getTeamMembersForInternalSelect,
} from "@/lib/queries/internal";
import { meetingFiltersSchema } from "@/lib/validations/internal";
import { redirect } from "next/navigation";

type MeetingsPageProps = {
  searchParams: Promise<{
    type?: string;
    visibility?: string;
    participant?: string;
    from?: string;
    to?: string;
  }>;
};

export default async function InternalMeetingsPage({
  searchParams,
}: MeetingsPageProps) {
  const teamMember = await getTeamMember();
  if (!teamMember) {
    redirect("/login");
  }

  const params = await searchParams;
  const parsed = meetingFiltersSchema.safeParse({
    type: params.type || undefined,
    visibility: params.visibility || undefined,
    participant: params.participant || undefined,
    from: params.from ? `${params.from}T00:00:00.000Z` : undefined,
    to: params.to ? `${params.to}T23:59:59.999Z` : undefined,
  });

  const filters = parsed.success ? parsed.data : {};

  const [meetings, teamMembers] = await Promise.all([
    getMeetings(filters),
    getTeamMembersForInternalSelect(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team Meetings</h1>
          <p className="text-sm text-muted-foreground">
            {meetings.length} meeting{meetings.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <Suspense fallback={<FiltersSkeleton />}>
        <MeetingsFilters teamMembers={teamMembers} />
      </Suspense>

      <MeetingsPageClient
        meetings={meetings}
        teamMembers={teamMembers}
        currentUserId={teamMember.id}
        isAdmin={teamMember.role === "admin"}
      />
    </div>
  );
}

function FiltersSkeleton() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-8 w-44" />
      <Skeleton className="h-8 w-44" />
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-8 w-40" />
    </div>
  );
}
