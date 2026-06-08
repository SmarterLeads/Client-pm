import {
  Calendar,
  FileText,
  Headphones,
  Mail,
  MessageSquare,
  Phone,
  Presentation,
  type LucideIcon,
} from "lucide-react";
import type { InteractionType } from "@/lib/interactions/types";
import { cn } from "@/lib/utils";

const typeIcons: Record<InteractionType, LucideIcon> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: FileText,
  demo: Presentation,
  support: Headphones,
};

type InteractionTypeIconProps = {
  type: InteractionType;
  className?: string;
};

export function InteractionTypeIcon({ type, className }: InteractionTypeIconProps) {
  const Icon = typeIcons[type] ?? MessageSquare;
  return <Icon className={cn("size-4", className)} aria-hidden />;
}
