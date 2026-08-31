import { notFound, redirect } from "next/navigation";

import { KbCategoryArticles } from "@/components/knowledge-base/kb-category-articles";
import { canManageKnowledgeBase } from "@/lib/knowledge-base/access";
import { getTeamMember } from "@/lib/auth/session";
import { getKbArticlesByCategory } from "@/lib/queries/knowledge-base";

type KnowledgeBaseCategoryPageProps = {
  params: Promise<{ categorySlug: string }>;
  searchParams: Promise<{ sub?: string }>;
};

export default async function KnowledgeBaseCategoryPage({
  params,
  searchParams,
}: KnowledgeBaseCategoryPageProps) {
  const teamMember = await getTeamMember();
  if (!teamMember) redirect("/login");

  const { categorySlug } = await params;
  const { sub } = await searchParams;
  const result = await getKbArticlesByCategory(categorySlug);
  if (!result) notFound();

  const activeSub = sub?.trim() || null;
  if (
    activeSub &&
    activeSub !== "general" &&
    !result.subcategories.some((item) => item.slug === activeSub)
  ) {
    notFound();
  }

  return (
    <KbCategoryArticles
      category={result.category}
      subcategories={result.subcategories}
      articles={result.articles}
      canEdit={canManageKnowledgeBase(teamMember)}
      activeSub={activeSub}
    />
  );
}
