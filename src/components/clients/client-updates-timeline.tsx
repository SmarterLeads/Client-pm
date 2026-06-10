"use client";

import { UpdateChannelBadge } from "@/components/clients/update-channel-badge";
import { FormattedText } from "@/components/shared/formatted-text";
import { formatUpdateDateTime } from "@/lib/updates/display";
import type { ClientUpdateRow } from "@/lib/updates/types";

type ClientUpdatesTimelineProps = {
  updates: ClientUpdateRow[];
};

export function ClientUpdatesTimeline({ updates }: ClientUpdatesTimelineProps) {
  return (
    <ol className="relative space-y-0 border-l border-border pl-6">
      {updates.map((item) => (
        <li key={item.id} className="relative pb-8 last:pb-0">
          <span className="absolute -left-[0.4rem] top-2 size-2 rounded-full bg-primary" />
          <div className="rounded-lg border border-border bg-card p-4">
            <UpdateChannelBadge channel={item.marketing_channel} />

            <FormattedText className="mt-2">{item.summary}</FormattedText>

            <p className="mt-3 text-xs text-muted-foreground">
              {item.logged_by_name ? (
                <span>Logged by {item.logged_by_name}</span>
              ) : (
                <span>Logged</span>
              )}
              {" · "}
              <time dateTime={item.occurred_at}>
                {formatUpdateDateTime(item.occurred_at)}
              </time>
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
