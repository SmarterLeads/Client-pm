import { notFound, redirect } from "next/navigation";

import { KbCategoryArticles } from "@/components/knowledge-base/kb-category-articles";
import { getTeamMember } from "@/lib/auth/session";
import { getKbArticlesByCategory } from "@/lib/queries/knowledge-base";

type KnowledgeBaseCategoryPageProps = {
  params: Promise<{ categorySlug: string }>;
};

export default async function KnowledgeBaseCategoryPage({
  params,
}: KnowledgeBaseCategoryPageProps) {
  const teamMember = await getTeamMember();
  if (!teamMember) redirect("/login");

  const { categorySlug } = await params;
  const result = await getKbArticlesByCategory(categorySlug);
  if (!result) notFound();

  return (
    <KbCategoryArticles category={result.category} articles={result.articles} />
  );
}
