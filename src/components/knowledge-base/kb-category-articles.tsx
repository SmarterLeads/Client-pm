"use client";

import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";

import { KbArticleList } from "@/components/knowledge-base/kb-article-list";
import { KbSubcategoryManager } from "@/components/knowledge-base/kb-subcategory-manager";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  KbArticleListRow,
  KbCategoryRow,
  KbSubcategoryRow,
} from "@/lib/knowledge-base/types";

type KbCategoryArticlesProps = {
  category: KbCategoryRow;
  subcategories: KbSubcategoryRow[];
  articles: KbArticleListRow[];
  canEdit: boolean;
  activeSub: string | null;
};

const GENERAL_SUB = "general";

function buildNewArticleHref(categorySlug: string, activeSub: string | null): string {
  const params = new URLSearchParams({ category: categorySlug });
  if (activeSub && activeSub !== GENERAL_SUB) {
    params.set("sub", activeSub);
  } else if (activeSub === GENERAL_SUB) {
    params.set("sub", GENERAL_SUB);
  }
  return `/knowledge-base/new?${params.toString()}`;
}

export function KbCategoryArticles({
  category,
  subcategories,
  articles,
  canEdit,
  activeSub,
}: KbCategoryArticlesProps) {
  const generalArticles = articles.filter((article) => !article.subcategory_id);
  const articlesBySub = new Map<string, KbArticleListRow[]>();
  for (const sub of subcategories) {
    articlesBySub.set(
      sub.slug,
      articles.filter((article) => article.subcategory_slug === sub.slug),
    );
  }

  const articleCountBySubcategoryId = Object.fromEntries(
    subcategories.map((sub) => [
      sub.id,
      articles.filter((article) => article.subcategory_id === sub.id).length,
    ]),
  );

  function tabHref(sub: string | null): string {
    if (!sub) return `/knowledge-base/${category.slug}`;
    return `/knowledge-base/${category.slug}?sub=${encodeURIComponent(sub)}`;
  }

  const tabs = [
    { key: null, label: "All", count: articles.length },
    { key: GENERAL_SUB, label: "General", count: generalArticles.length },
    ...subcategories.map((sub) => ({
      key: sub.slug,
      label: sub.name,
      count: articlesBySub.get(sub.slug)?.length ?? 0,
    })),
  ];

  const newArticleSub =
    activeSub && tabs.some((tab) => tab.key === activeSub) ? activeSub : null;

  let content: React.ReactNode;

  if (!activeSub) {
    const sections = [
      {
        title: "General",
        subcategoryId: null as string | null,
        items: generalArticles,
      },
      ...subcategories.map((sub) => ({
        title: sub.name,
        subcategoryId: sub.id,
        items: articlesBySub.get(sub.slug) ?? [],
      })),
    ].filter((section) => section.items.length > 0 || canEdit);

    content =
      sections.length === 0 ? (
        <KbArticleList
          articles={[]}
          categoryId={category.id}
          categorySlug={category.slug}
          subcategoryId={null}
          canEdit={canEdit}
          emptyMessage="No articles in this category yet."
        />
      ) : (
        <div className="space-y-10">
          {sections.map((section) =>
            section.items.length === 0 ? null : (
              <section key={section.title} className="space-y-4">
                <h2 className="text-lg font-semibold">{section.title}</h2>
                <KbArticleList
                  articles={section.items}
                  categoryId={category.id}
                  categorySlug={category.slug}
                  subcategoryId={section.subcategoryId}
                  canEdit={canEdit}
                  emptyMessage=""
                />
              </section>
            ),
          )}
        </div>
      );
  } else if (activeSub === GENERAL_SUB) {
    content = (
      <KbArticleList
        articles={generalArticles}
        categoryId={category.id}
        categorySlug={category.slug}
        subcategoryId={null}
        canEdit={canEdit}
        emptyMessage="No articles in General yet."
      />
    );
  } else {
    const subcategory = subcategories.find((sub) => sub.slug === activeSub);
    content = (
      <KbArticleList
        articles={articlesBySub.get(activeSub) ?? []}
        categoryId={category.id}
        categorySlug={category.slug}
        subcategoryId={subcategory?.id ?? null}
        canEdit={canEdit}
        emptyMessage="No articles in this sub-category yet."
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <nav className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/knowledge-base" className="hover:text-foreground">
          Knowledge Base
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">{category.name}</span>
      </nav>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{category.name}</h1>
          {category.description ? (
            <p className="max-w-2xl text-muted-foreground">{category.description}</p>
          ) : null}
          <p className="text-sm text-muted-foreground">
            {articles.length} {articles.length === 1 ? "article" : "articles"}
          </p>
        </div>
        {canEdit ? (
          <Button
            className="shrink-0"
            render={
              <Link href={buildNewArticleHref(category.slug, newArticleSub)} />
            }
          >
            <Plus className="size-4" />
            New article
          </Button>
        ) : null}
      </header>

      {(subcategories.length > 0 || canEdit) && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 border-b border-border pb-1">
            {tabs.map((tab) => (
              <Link
                key={tab.key ?? "all"}
                href={tabHref(tab.key)}
                className={cn(
                  "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition",
                  (activeSub ?? null) === tab.key
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
                <span className="ml-1.5 text-xs text-muted-foreground">({tab.count})</span>
              </Link>
            ))}
          </div>

          {canEdit ? (
            <KbSubcategoryManager
              parentCategoryId={category.id}
              subcategories={subcategories}
              articleCountBySubcategoryId={articleCountBySubcategoryId}
            />
          ) : null}
        </div>
      )}

      {content}
    </div>
  );
}
