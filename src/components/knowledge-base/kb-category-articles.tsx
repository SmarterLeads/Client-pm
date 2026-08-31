"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { KbArticleListRow, KbCategoryRow } from "@/lib/knowledge-base/types";

type KbCategoryArticlesProps = {
  category: KbCategoryRow;
  articles: KbArticleListRow[];
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

export function KbCategoryArticles({ category, articles }: KbCategoryArticlesProps) {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <nav className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/knowledge-base" className="hover:text-foreground">
          Knowledge Base
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">{category.name}</span>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{category.name}</h1>
        {category.description ? (
          <p className="max-w-2xl text-muted-foreground">{category.description}</p>
        ) : null}
        <p className="text-sm text-muted-foreground">
          {articles.length} {articles.length === 1 ? "article" : "articles"}
        </p>
      </header>

      {articles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">No articles in this category yet.</p>
        </div>
      ) : (
        <ul className="grid gap-4">
          {articles.map((article) => (
            <li key={article.id}>
              <Link
                href={`/knowledge-base/${category.slug}/${article.slug}`}
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
          ))}
        </ul>
      )}
    </div>
  );
}
