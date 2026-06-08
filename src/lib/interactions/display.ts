import type { InteractionChannel, InteractionType } from "@/lib/interactions/types";

export const interactionTypeLabels: Record<InteractionType, string> = {
  call: "Call",
  email: "Email",
  meeting: "Meeting",
  note: "Note",
  demo: "Demo",
  support: "Support",
};

export const channelLabels: Record<InteractionChannel, string> = {
  phone: "Phone",
  email: "Email",
  video: "Video",
  in_person: "In person",
  slack: "Slack",
  sms: "SMS",
};

export function formatInteractionDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
