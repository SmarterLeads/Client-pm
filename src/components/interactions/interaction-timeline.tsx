"use client";

import { useState } from "react";
import { InteractionPeopleDetails, InteractionPeopleSummary } from "@/components/interactions/interaction-people";
import { InteractionTypeIcon } from "@/components/interactions/interaction-type-icon";
import { RichTextDisplay } from "@/components/shared/rich-text-display-lazy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  channelLabels,
  formatInteractionDateTime,
} from "@/lib/interactions/display";
import type { InteractionRow } from "@/lib/interactions/types";
import { cn } from "@/lib/utils";
import { Pencil, Trash2 } from "lucide-react";

type InteractionTimelineProps = {
  interactions: InteractionRow[];
  clientId?: string;
  currentTeamMemberId?: string | null;
  isAdmin?: boolean;
  deletingId?: string | null;
  onEdit?: (item: InteractionRow) => void;
  onDelete?: (item: InteractionRow) => void;
};

function canManageInteraction(
  item: InteractionRow,
  currentTeamMemberId: string | null | undefined,
  isAdmin: boolean | undefined,
) {
  if (!currentTeamMemberId) return false;
  if (isAdmin) return true;
  return item.logged_by === currentTeamMemberId;
}

export function InteractionTimeline({
  interactions,
  clientId,
  currentTeamMemberId,
  isAdmin = false,
  deletingId = null,
  onEdit,
  onDelete,
}: InteractionTimelineProps) {
  return (
    <ol className="relative space-y-0 border-l border-border pl-6">
      {interactions.map((item) => (
        <InteractionTimelineItem
          key={item.id}
          item={item}
          clientId={clientId}
          canManage={canManageInteraction(item, currentTeamMemberId, isAdmin)}
          isDeleting={deletingId === item.id}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </ol>
  );
}

function InteractionTimelineItem({
  item,
  clientId,
  canManage,
  isDeleting,
  onEdit,
  onDelete,
}: {
  item: InteractionRow;
  clientId?: string;
  canManage: boolean;
  isDeleting: boolean;
  onEdit?: (item: InteractionRow) => void;
  onDelete?: (item: InteractionRow) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasBody = Boolean(item.body?.trim());
  const showActions = canManage && (onEdit || onDelete);
  const hasPeople = item.contacts.length > 0 || item.attendees.length > 0;

  return (
    <li className="relative pb-8 last:pb-0">
      <span className="absolute -left-[1.65rem] flex size-8 items-center justify-center rounded-full border border-border bg-background">
        <InteractionTypeIcon type={item.type} className="text-muted-foreground" />
      </span>
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start gap-2">
              {item.channel ? (
                <Badge variant="secondary">{channelLabels[item.channel]}</Badge>
              ) : null}
            </div>

            <p className="mt-2 font-semibold">{item.summary}</p>

            {hasPeople ? (
              <div className="mt-2">
                <InteractionPeopleSummary item={item} clientId={clientId} />
                <InteractionPeopleDetails item={item} clientId={clientId} />
              </div>
            ) : null}

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
              {item.logged_by_name ? (
                <span>Logged by {item.logged_by_name}</span>
              ) : (
                <span>Logged</span>
              )}
              {" · "}
              <time dateTime={item.occurred_at}>
                {formatInteractionDateTime(item.occurred_at)}
              </time>
            </p>
          </div>

          {showActions ? (
            <div className="flex shrink-0 items-center gap-1">
              {onEdit ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Edit interaction"
                  onClick={() => onEdit(item)}
                  disabled={isDeleting}
                >
                  <Pencil className="size-3.5" />
                </Button>
              ) : null}
              {onDelete ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Delete interaction"
                  onClick={() => onDelete(item)}
                  disabled={isDeleting}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}
