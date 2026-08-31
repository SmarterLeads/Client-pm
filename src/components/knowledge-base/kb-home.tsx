"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { BookOpen, ChevronRight, Plus } from "lucide-react";

import { KbCategoryManager } from "@/components/knowledge-base/kb-category-manager";
import { KbHomeSearchPanel, KbSearch } from "@/components/knowledge-base/kb-search";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getKbCategoryIcon } from "@/lib/knowledge-base/category-icons";
import { searchKnowledgeBase } from "@/lib/actions/knowledge-base";
import type {
  KbArticleListRow,
  KbCategoryRow,
  KbSearchResult,
} from "@/lib/knowledge-base/types";

type KbHomeProps = {
  categories: KbCategoryRow[];
  recentArticles: KbArticleListRow[];
  canEdit: boolean;
};

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function KbHome({ categories, recentArticles, canEdit }: KbHomeProps) {
  const [inlineQuery, setInlineQuery] = useState("");
  const [inlineResults, setInlineResults] = useState<KbSearchResult[]>([]);
  const [, startTransition] = useTransition();

  function runInlineSearch(value: string) {
    setInlineQuery(value);
    if (!value.trim()) {
      setInlineResults([]);
      return;
    }
    startTransition(async () => {
      const results = await searchKnowledgeBase(value);
      setInlineResults(results);
    });
  }

  const searching = inlineQuery.trim().length > 0;

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <header className="flex flex-col gap-6 border-b border-border pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
          <p className="max-w-xl text-muted-foreground">
            Internal wiki for onboarding, processes, and team playbooks.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto lg:min-w-[420px]">
          <div className="flex-1">
            <KbSearch />
          </div>
          {canEdit ? (
            <div className="flex shrink-0 gap-2">
              <KbCategoryManager categories={categories} />
              <Button render={<Link href="/knowledge-base/new" />}>
                <Plus className="size-4" />
                New article
              </Button>
            </div>
          ) : null}
        </div>
      </header>

      <div className="space-y-3">
        <input
          type="search"
          value={inlineQuery}
          onChange={(event) => runInlineSearch(event.target.value)}
          placeholder="Quick search titles and content…"
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        {searching ? <KbHomeSearchPanel query={inlineQuery} results={inlineResults} /> : null}
      </div>

      {!searching ? (
        <>
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Browse by category</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {categories.map((category) => {
                const Icon = getKbCategoryIcon(category.slug);
                return (
                  <Link
                    key={category.id}
                    href={`/knowledge-base/${category.slug}`}
                    className="group flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/30 hover:shadow-md"
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="size-5" />
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
                    </div>
                    <h3 className="font-semibold">{category.name}</h3>
                    {category.description ? (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {category.description}
                      </p>
                    ) : null}
                    <p className="mt-auto pt-4 text-xs font-medium text-muted-foreground">
                      {category.article_count ?? 0}{" "}
                      {(category.article_count ?? 0) === 1 ? "article" : "articles"}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Recent articles</h2>
            {recentArticles.length === 0 ? (
              <p className="text-sm text-muted-foreground">No articles yet.</p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {recentArticles.map((article) => (
                  <li key={article.id}>
                    <Link
                      href={`/knowledge-base/${article.category_slug}/${article.slug}`}
                      className="flex h-full gap-3 rounded-xl border border-border bg-card p-4 transition hover:border-primary/30 hover:bg-muted/20"
                    >
                      <BookOpen className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium leading-snug">
                          {article.title}
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          {article.updated_by_name ? (
                            <>
                              <Avatar size="sm">
                                {article.updated_by_avatar_url ? (
                                  <AvatarImage
                                    src={article.updated_by_avatar_url}
                                    alt=""
                                  />
                                ) : null}
                                <AvatarFallback className="text-[9px]">
                                  {initials(article.updated_by_name)}
                                </AvatarFallback>
                              </Avatar>
                              {article.updated_by_name}
                              <span aria-hidden>·</span>
                            </>
                          ) : null}
                          {article.category_name} ·{" "}
                          {new Date(article.updated_at).toLocaleDateString()}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
