"use client";

import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";

import { KbSubcategoryManager } from "@/components/knowledge-base/kb-subcategory-manager";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function buildNewArticleHref(categorySlug: string, activeSub: string | null): string {
  const params = new URLSearchParams({ category: categorySlug });
  if (activeSub && activeSub !== GENERAL_SUB) {
    params.set("sub", activeSub);
  } else if (activeSub === GENERAL_SUB) {
    params.set("sub", GENERAL_SUB);
  }
  return `/knowledge-base/new?${params.toString()}`;
}

function ArticleCard({
  article,
  categorySlug,
}: {
  article: KbArticleListRow;
  categorySlug: string;
}) {
  return (
    <li>
      <Link
        href={`/knowledge-base/${categorySlug}/${article.slug}`}
        className="group block rounded-xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/30 hover:shadow-md"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <h2 className="text-lg font-semibold group-hover:text-primary">
              {article.title}
            </h2>
            {article.excerpt ? (
              <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                {article.excerpt}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
              {article.updated_by_name ? (
                <span className="flex items-center gap-1.5">
                  <Avatar size="sm">
                    {article.updated_by_avatar_url ? (
                      <AvatarImage src={article.updated_by_avatar_url} alt="" />
                    ) : null}
                    <AvatarFallback className="text-[9px]">
                      {initials(article.updated_by_name)}
                    </AvatarFallback>
                  </Avatar>
                  {article.updated_by_name}
                </span>
              ) : null}
              <span aria-hidden>·</span>
              <time dateTime={article.updated_at}>
                Updated{" "}
                {new Date(article.updated_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </time>
            </div>
          </div>
          <ChevronRight className="size-5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
        </div>
      </Link>
    </li>
  );
}

function ArticleList({
  articles,
  categorySlug,
  emptyMessage,
}: {
  articles: KbArticleListRow[];
  categorySlug: string;
  emptyMessage: string;
}) {
  if (articles.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ul className="grid gap-4">
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} categorySlug={categorySlug} />
      ))}
    </ul>
  );
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
      { title: "General", items: generalArticles },
      ...subcategories.map((sub) => ({
        title: sub.name,
        items: articlesBySub.get(sub.slug) ?? [],
      })),
    ].filter((section) => section.items.length > 0);

    content =
      sections.length === 0 ? (
        <ArticleList
          articles={[]}
          categorySlug={category.slug}
          emptyMessage="No articles in this category yet."
        />
      ) : (
        <div className="space-y-10">
          {sections.map((section) => (
            <section key={section.title} className="space-y-4">
              <h2 className="text-lg font-semibold">{section.title}</h2>
              <ArticleList
                articles={section.items}
                categorySlug={category.slug}
                emptyMessage=""
              />
            </section>
          ))}
        </div>
      );
  } else if (activeSub === GENERAL_SUB) {
    content = (
      <ArticleList
        articles={generalArticles}
        categorySlug={category.slug}
        emptyMessage="No articles in General yet."
      />
    );
  } else {
    content = (
      <ArticleList
        articles={articlesBySub.get(activeSub) ?? []}
        categorySlug={category.slug}
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
