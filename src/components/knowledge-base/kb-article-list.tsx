"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { ChevronRight, GripVertical } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { reorderArticles } from "@/lib/actions/knowledge-base";
import type { KbArticleListRow } from "@/lib/knowledge-base/types";
import { toastError, toastSuccess } from "@/lib/toast";

type KbArticleListProps = {
  articles: KbArticleListRow[];
  categoryId: string;
  categorySlug: string;
  subcategoryId: string | null;
  canEdit: boolean;
  emptyMessage: string;
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

function ArticleCard({
  article,
  categorySlug,
  sortable,
}: {
  article: KbArticleListRow;
  categorySlug: string;
  sortable: boolean;
}) {
  return (
    <div className="flex items-stretch gap-2">
      {sortable ? (
        <div className="flex shrink-0 items-center pt-5 text-muted-foreground">
          <GripVertical className="size-4 cursor-grab active:cursor-grabbing" />
        </div>
      ) : null}
      <Link
        href={`/knowledge-base/${categorySlug}/${article.slug}`}
        className="group block min-w-0 flex-1 rounded-xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/30 hover:shadow-md"
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
    </div>
  );
}

export function KbArticleList({
  articles,
  categoryId,
  categorySlug,
  subcategoryId,
  canEdit,
  emptyMessage,
}: KbArticleListProps) {
  const [items, setItems] = useState(articles);
  const [dragId, setDragId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const sortable = canEdit && items.length > 1;

  useEffect(() => {
    setItems(articles);
  }, [articles]);

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;

    const next = [...items];
    const fromIndex = next.findIndex((item) => item.id === dragId);
    const toIndex = next.findIndex((item) => item.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;

    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setItems(next);
    setDragId(null);

    startTransition(async () => {
      const result = await reorderArticles({
        categoryId,
        subcategoryId,
        orderedIds: next.map((item) => item.id),
      });
      if (result.error) {
        toastError(result.error);
        setItems(articles);
        return;
      }
      toastSuccess("Articles reordered");
    });
  }

  return (
    <div className="space-y-3">
      {sortable ? (
        <p className="text-xs text-muted-foreground">
          Drag articles to reorder{isPending ? "…" : ""}.
        </p>
      ) : null}
      <ul className="grid gap-4">
        {items.map((article) => (
          <li
            key={article.id}
            draggable={sortable && !isPending}
            onDragStart={() => setDragId(article.id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => handleDrop(article.id)}
            className={sortable ? "rounded-lg" : undefined}
          >
            <ArticleCard
              article={article}
              categorySlug={categorySlug}
              sortable={sortable}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
