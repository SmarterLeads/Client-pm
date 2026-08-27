import { notFound, redirect } from "next/navigation";

import { KbArticleEditor } from "@/components/knowledge-base/kb-article-editor";
import { canManageKnowledgeBase } from "@/lib/knowledge-base/access";
import { getTeamMember } from "@/lib/auth/session";
import {
  getKbArticleForEdit,
  getKbCategories,
} from "@/lib/queries/knowledge-base";

type KnowledgeBaseArticleEditPageProps = {
  params: Promise<{ categorySlug: string; articleSlug: string }>;
};

export default async function KnowledgeBaseArticleEditPage({
  params,
}: KnowledgeBaseArticleEditPageProps) {
  const teamMember = await getTeamMember();
  if (!teamMember) redirect("/login");
  if (!canManageKnowledgeBase(teamMember)) redirect("/knowledge-base");

  const { categorySlug, articleSlug } = await params;
  const [article, categories] = await Promise.all([
    getKbArticleForEdit(categorySlug, articleSlug),
    getKbCategories(),
  ]);

  if (!article) notFound();

  return (
    <div className="space-y-4">
      <KbArticleEditor article={article} categories={categories} />
    </div>
  );
}
