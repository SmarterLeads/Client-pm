import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  agencyAccentColor,
  type AgencyWithStats,
} from "@/lib/queries/agencies";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

type AgencyCardProps = {
  agency: AgencyWithStats;
};

export function AgencyCard({ agency }: AgencyCardProps) {
  const accent = agencyAccentColor(agency.primary_color);

  return (
    <Link
      href={`/clients?agency_id=${agency.id}`}
      className="group block rounded-xl ring-1 ring-foreground/10 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <article className="flex h-full flex-col overflow-hidden rounded-xl bg-card">
        <div className="h-1.5 w-full shrink-0" style={{ backgroundColor: accent }} />

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-start gap-3">
            <Avatar size="lg" className="ring-2" style={{ boxShadow: `0 0 0 2px ${accent}33` }}>
              {agency.logo_url ? (
                <AvatarImage src={agency.logo_url} alt="" />
              ) : null}
              <AvatarFallback style={{ backgroundColor: `${accent}22`, color: accent }}>
                {initials(agency.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold tracking-tight group-hover:underline">
                {agency.name}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                View {agency.client_count} client
                {agency.client_count === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-muted/50 px-2 py-2">
              <dt className="text-xs text-muted-foreground">Clients</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                {agency.client_count}
              </dd>
            </div>
            <div className="rounded-lg bg-muted/50 px-2 py-2">
              <dt className="text-xs text-muted-foreground">Active projects</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                {agency.active_projects}
              </dd>
            </div>
            <div className="rounded-lg bg-muted/50 px-2 py-2">
              <dt className="text-xs text-muted-foreground">Open tasks</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                {agency.open_tasks}
              </dd>
            </div>
          </dl>

          <div className="mt-auto border-t border-border pt-3">
            <p className="text-xs font-medium text-muted-foreground">
              Account managers
            </p>
            {agency.account_managers.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">—</p>
            ) : (
              <p className="mt-1 text-sm leading-relaxed">
                {agency.account_managers.map((manager) => manager.name).join(", ")}
              </p>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
