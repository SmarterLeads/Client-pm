import {
  Calendar,
  FileSignature,
  FileText,
  Headphones,
  MessageSquare,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { INTERACTION_TYPES } from "@/lib/interactions/constants";
import type { InteractionChannel, InteractionType } from "@/lib/interactions/types";

export const interactionTypeLabels: Record<InteractionType, string> = {
  meeting: "Meeting",
  check_in: "Check In / Update",
  report: "Report",
  support: "Support",
  quote: "Quote",
  call: "Check In / Update",
  email: "Check In / Update",
  note: "Check In / Update",
  demo: "Meeting",
};

export const interactionTypeOptions = INTERACTION_TYPES.map((value) => ({
  value,
  label: interactionTypeLabels[value],
}));

export const interactionTypeIcons: Record<InteractionType, LucideIcon> = {
  meeting: Calendar,
  check_in: RefreshCw,
  report: FileText,
  support: Headphones,
  quote: FileSignature,
  call: RefreshCw,
  email: RefreshCw,
  note: RefreshCw,
  demo: Calendar,
};

export function interactionTypeLabel(type: InteractionType) {
  return interactionTypeLabels[type] ?? type;
}

export function getInteractionTypeIcon(type: InteractionType) {
  return interactionTypeIcons[type] ?? MessageSquare;
}

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
