import { notFound, redirect } from "next/navigation";

import { KbArticleEditor } from "@/components/knowledge-base/kb-article-editor";
import { canManageKnowledgeBase } from "@/lib/knowledge-base/access";
import { getTeamMember } from "@/lib/auth/session";
import {
  getKbArticleForEdit,
  getKbArticleForEditBySlug,
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
  let [article, categories] = await Promise.all([
    getKbArticleForEdit(categorySlug, articleSlug),
    getKbCategories(),
  ]);

  if (!article) {
    const bySlug = await getKbArticleForEditBySlug(articleSlug);
    if (bySlug) {
      if (bySlug.category_slug !== categorySlug) {
        redirect(
          `/knowledge-base/${bySlug.category_slug}/${bySlug.slug}/edit`,
        );
      }
      article = bySlug;
    }
  }

  if (!article) notFound();

  return (
    <div className="space-y-4">
      <KbArticleEditor article={article} categories={categories} />
    </div>
  );
}
