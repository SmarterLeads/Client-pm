import { notFound, redirect } from "next/navigation";

import { KbArticleView } from "@/components/knowledge-base/kb-article-view";
import { canManageKnowledgeBase } from "@/lib/knowledge-base/access";
import { getTeamMember } from "@/lib/auth/session";
import {
  getKbArticleBySlug,
  getKbArticleBySlugs,
  getKbArticleVersions,
} from "@/lib/queries/knowledge-base";

type KnowledgeBaseArticlePageProps = {
  params: Promise<{ categorySlug: string; articleSlug: string }>;
};

export default async function KnowledgeBaseArticlePage({
  params,
}: KnowledgeBaseArticlePageProps) {
  const teamMember = await getTeamMember();
  if (!teamMember) redirect("/login");

  const { categorySlug, articleSlug } = await params;
  let article = await getKbArticleBySlugs(categorySlug, articleSlug);

  if (!article) {
    const bySlug = await getKbArticleBySlug(articleSlug);
    if (bySlug) {
      if (bySlug.category_slug !== categorySlug) {
        redirect(`/knowledge-base/${bySlug.category_slug}/${bySlug.slug}`);
      }
      article = bySlug;
    }
  }

  if (!article) notFound();

  const canEdit = canManageKnowledgeBase(teamMember);
  const versions = canEdit ? await getKbArticleVersions(article.id) : [];

  return (
    <KbArticleView article={article} versions={versions} canEdit={canEdit} />
  );
}
