import { redirect } from "next/navigation";

import { KbHome } from "@/components/knowledge-base/kb-home";
import { canManageKnowledgeBase } from "@/lib/knowledge-base/access";
import { getTeamMember } from "@/lib/auth/session";
import {
  getKbCategories,
  getKbRecentArticles,
} from "@/lib/queries/knowledge-base";

export default async function KnowledgeBasePage() {
  const teamMember = await getTeamMember();
  if (!teamMember) redirect("/login");

  const [categories, recentArticles] = await Promise.all([
    getKbCategories(),
    getKbRecentArticles(),
  ]);

  return (
    <KbHome
      categories={categories}
      recentArticles={recentArticles}
      canEdit={canManageKnowledgeBase(teamMember)}
    />
  );
}
