import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { KbNewArticleForm } from "@/components/knowledge-base/kb-new-article-form";
import { canManageKnowledgeBase } from "@/lib/knowledge-base/access";
import { getTeamMember } from "@/lib/auth/session";
import {
  getKbAllSubcategories,
  getKbCategories,
  getKbCategoryBySlug,
} from "@/lib/queries/knowledge-base";

type KnowledgeBaseNewArticlePageProps = {
  searchParams: Promise<{ category?: string; sub?: string }>;
};

export default async function KnowledgeBaseNewArticlePage({
  searchParams,
}: KnowledgeBaseNewArticlePageProps) {
  const teamMember = await getTeamMember();
  if (!teamMember) redirect("/login");
  if (!canManageKnowledgeBase(teamMember)) redirect("/knowledge-base");

  const { category: categorySlug, sub: subSlug } = await searchParams;
  const categories = await getKbCategories();
  if (categories.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">New article</h1>
        <p className="text-sm text-muted-foreground">
          Create a category before adding articles.
        </p>
        <Link href="/knowledge-base" className="text-sm text-primary underline">
          Back to knowledge base
        </Link>
      </div>
    );
  }

  const defaultCategory =
    (categorySlug ? await getKbCategoryBySlug(categorySlug) : null) ??
    categories[0];

  if (categorySlug && !defaultCategory) notFound();

  const subcategories = await getKbAllSubcategories();
  if (
    subSlug &&
    subSlug !== "general" &&
    defaultCategory &&
    !subcategories.some(
      (item) =>
        item.parent_id === defaultCategory.id && item.slug === subSlug,
    )
  ) {
    notFound();
  }

  const backHref = defaultCategory
    ? subSlug
      ? `/knowledge-base/${defaultCategory.slug}?sub=${encodeURIComponent(subSlug)}`
      : `/knowledge-base/${defaultCategory.slug}`
    : "/knowledge-base";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={backHref}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {defaultCategory?.name ?? "Knowledge base"}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">New article</h1>
      </div>
      <KbNewArticleForm
        categories={categories}
        subcategories={subcategories}
        defaultCategorySlug={defaultCategory?.slug}
        defaultSubcategorySlug={subSlug}
      />
    </div>
  );
}
