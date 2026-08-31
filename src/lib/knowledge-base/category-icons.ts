import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Briefcase,
  ChartBar,
  Cog,
  Megaphone,
  Search,
  Users,
  Wrench,
} from "lucide-react";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "client-onboarding": Users,
  "google-ads": Megaphone,
  "meta-ads": Megaphone,
  "microsoft-ads": Megaphone,
  "tik-tok-ads": Megaphone,
  seo: Search,
  reporting: ChartBar,
  "monthly-management": Briefcase,
  "employee-onboarding": BookOpen,
  "business-administration": Briefcase,
  "tech-stack": Wrench,
};

export function getKbCategoryIcon(slug: string): LucideIcon {
  return CATEGORY_ICONS[slug] ?? Cog;
}
