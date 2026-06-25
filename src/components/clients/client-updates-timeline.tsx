"use client";

import { useEffect, useRef, useState } from "react";
import { UpdateChannelBadge } from "@/components/clients/update-channel-badge";
import { RichTextDisplay } from "@/components/shared/rich-text-display-lazy";
import {
  formatUpdateDateCompact,
  plainTextUpdateSummary,
} from "@/lib/updates/display";
import type { ClientUpdateRow } from "@/lib/updates/types";
import { cn } from "@/lib/utils";

type ClientUpdatesTimelineProps = {
  updates: ClientUpdateRow[];
};

function ClientUpdateTimelineItem({ item }: { item: ClientUpdateRow }) {
  const [expanded, setExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const summaryRef = useRef<HTMLSpanElement>(null);
  const plainSummary = plainTextUpdateSummary(item.summary);

  useEffect(() => {
    const element = summaryRef.current;
    if (!element) return;

    const checkTruncation = () => {
      setIsTruncated(element.scrollWidth > element.clientWidth);
    };

    checkTruncation();
    window.addEventListener("resize", checkTruncation);
    return () => window.removeEventListener("resize", checkTruncation);
  }, [plainSummary]);

  const canExpand = isTruncated || expanded;
  const loggedByLabel = item.logged_by_name ?? "Unknown";

  return (
    <li className="relative">
      <span className="absolute -left-[0.4rem] top-1/2 size-2 -translate-y-1/2 rounded-full bg-primary" />

      <div className="min-w-0">
        <button
          type="button"
          disabled={!canExpand}
          onClick={() => {
            if (canExpand) setExpanded((current) => !current);
          }}
          className={cn(
            "flex flex-wrap items-center gap-2 py-2 text-left text-sm",
            canExpand && "cursor-pointer rounded-md hover:bg-muted/40",
          )}
        >
          <UpdateChannelBadge channel={item.marketing_channel} className="shrink-0" />

          <span
            ref={summaryRef}
            className="max-w-xl truncate text-foreground"
          >
            {plainSummary}
          </span>

          <span className="shrink-0 text-muted-foreground">·</span>

          <span className="shrink-0 text-muted-foreground">
            by {loggedByLabel} ·{" "}
            <time dateTime={item.occurred_at}>
              {formatUpdateDateCompact(item.occurred_at)}
            </time>
          </span>
        </button>

        {expanded ? (
          <div className="pb-2 pl-1">
            <RichTextDisplay className="text-sm text-muted-foreground">
              {item.summary}
            </RichTextDisplay>
          </div>
        ) : null}
      </div>
    </li>
  );
}

export function ClientUpdatesTimeline({ updates }: ClientUpdatesTimelineProps) {
  return (
    <ol className="relative space-y-0 border-l border-border pl-6">
      {updates.map((item) => (
        <ClientUpdateTimelineItem key={item.id} item={item} />
      ))}
    </ol>
  );
}
