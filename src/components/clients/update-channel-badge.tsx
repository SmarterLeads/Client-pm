import {
  formatStoredUpdateChannel,
  getUpdateChannelBadgeClass,
} from "@/lib/updates/display";
import { cn } from "@/lib/utils";

type UpdateChannelBadgeProps = {
  channel: string;
  className?: string;
};

export function UpdateChannelBadge({ channel, className }: UpdateChannelBadgeProps) {
  const { label, badgeKey } = formatStoredUpdateChannel(channel);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        getUpdateChannelBadgeClass(badgeKey),
        className,
      )}
    >
      {label}
    </span>
  );
}
