import type { InteractionType } from "@/lib/interactions/types";
import { getInteractionTypeIcon } from "@/lib/interactions/display";
import { cn } from "@/lib/utils";

type InteractionTypeIconProps = {
  type: InteractionType;
  className?: string;
};

export function InteractionTypeIcon({ type, className }: InteractionTypeIconProps) {
  const Icon = getInteractionTypeIcon(type);
  return <Icon className={cn("size-4", className)} aria-hidden />;
}
