"use client";

import { useState } from "react";
import { InteractionTypeIcon } from "@/components/interactions/interaction-type-icon";
import { RichTextDisplay } from "@/components/shared/rich-text-display";
import { Badge } from "@/components/ui/badge";
import {
  channelLabels,
  formatInteractionDateTime,
} from "@/lib/interactions/display";
import type { InteractionRow } from "@/lib/interactions/types";
import { cn } from "@/lib/utils";

type PortalInteractionTimelineProps = {
  interactions: InteractionRow[];
};

export function PortalInteractionTimeline({
  interactions,
}: PortalInteractionTimelineProps) {
  return (
    <ol className="relative space-y-0 border-l border-border pl-6">
      {interactions.map((item) => (
        <PortalInteractionTimelineItem key={item.id} item={item} />
      ))}
    </ol>
  );
}

function PortalInteractionTimelineItem({ item }: { item: InteractionRow }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasBody = Boolean(item.body?.trim());

  return (
    <li className="relative pb-8 last:pb-0">
      <span className="absolute -left-[1.65rem] flex size-8 items-center justify-center rounded-full border border-border bg-background">
        <InteractionTypeIcon type={item.type} className="text-muted-foreground" />
      </span>
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-start gap-2">
          {item.channel ? (
            <Badge variant="secondary">{channelLabels[item.channel]}</Badge>
          ) : null}
        </div>

        <p className="mt-2 font-semibold">{item.summary}</p>

        {hasBody ? (
          <div className="mt-2">
            <div className={cn(!isExpanded && "line-clamp-2")}>
              <RichTextDisplay className="text-muted-foreground">
                {item.body!}
              </RichTextDisplay>
            </div>
            <button
              type="button"
              onClick={() => setIsExpanded((v) => !v)}
              className="mt-1 text-xs font-medium text-primary hover:underline"
            >
              {isExpanded ? "Show less" : "Show more"}
            </button>
          </div>
        ) : null}

        <p className="mt-3 text-xs text-muted-foreground">
          <span>Your team</span>
          {" · "}
          <time dateTime={item.occurred_at}>
            {formatInteractionDateTime(item.occurred_at)}
          </time>
        </p>
      </div>
    </li>
  );
}
