"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { BookOpen, ChevronRight } from "lucide-react";

import { KbCategoryManager } from "@/components/knowledge-base/kb-category-manager";
import { KbHomeSearchPanel, KbSearch } from "@/components/knowledge-base/kb-search";
import { Button } from "@/components/ui/button";
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Knowledge Base</h1>
          <p className="text-sm text-muted-foreground">
            Internal wiki for onboarding, reporting, and team processes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit ? <KbCategoryManager categories={categories} /> : null}
          {canEdit ? (
            <Button render={<Link href="/knowledge-base/new" />}>New article</Button>
          ) : null}
        </div>
      </div>

      <KbSearch />

      <div className="space-y-3">
        <InputLikeSearch
          value={inlineQuery}
          onChange={runInlineSearch}
          placeholder="Quick search titles and content…"
        />
        <KbHomeSearchPanel query={inlineQuery} results={inlineResults} />
      </div>

      {!inlineQuery.trim() ? (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Categories</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/knowledge-base/${category.slug}`}
                  className="rounded-lg border border-border bg-card p-4 shadow-sm transition hover:bg-muted/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{category.name}</p>
                      {category.description ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {category.description}
                        </p>
                      ) : null}
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {category.article_count ?? 0}{" "}
                    {(category.article_count ?? 0) === 1 ? "article" : "articles"}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Recent articles</h2>
            {recentArticles.length === 0 ? (
              <p className="text-sm text-muted-foreground">No articles yet.</p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {recentArticles.map((article) => (
                  <li key={article.id}>
                    <Link
                      href={`/knowledge-base/${article.category_slug}/${article.slug}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40"
                    >
                      <BookOpen className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{article.title}</span>
                        <span className="block text-xs text-muted-foreground">
                          {article.category_name} · Updated{" "}
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

function InputLikeSearch({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <input
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="h-10 w-full max-w-xl rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    />
  );
}
