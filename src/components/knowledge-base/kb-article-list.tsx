"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import {
  ChevronDown,
  GripVertical,
  Pencil,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { reorderArticles } from "@/lib/actions/knowledge-base";
import type { KbArticleListRow } from "@/lib/knowledge-base/types";
import { cn } from "@/lib/utils";
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

function ArticleRow({
  article,
  categorySlug,
  sortable,
  canEdit,
}: {
  article: KbArticleListRow;
  categorySlug: string;
  sortable: boolean;
  canEdit: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const articleHref = `/knowledge-base/${categorySlug}/${article.slug}`;
  const editHref = `${articleHref}/edit`;

  return (
    <div className="relative flex items-stretch gap-2">
      {sortable ? (
        <div className="flex shrink-0 items-center text-muted-foreground">
          <GripVertical className="size-4 cursor-grab active:cursor-grabbing" />
        </div>
      ) : null}

      <div
        className={cn(
          "relative min-w-0 flex-1 rounded-xl border border-border bg-card shadow-sm",
          canEdit && "pb-9",
        )}
      >
        <div className="flex items-center gap-2 py-3 pl-4 pr-3">
          <Link
            href={articleHref}
            className="min-w-0 flex-1 truncate text-base font-medium hover:text-primary"
          >
            {article.title}
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse details" : "Expand details"}
            onClick={() => setExpanded((open) => !open)}
            className="shrink-0 text-muted-foreground"
          >
            <ChevronDown
              className={cn(
                "size-4 transition-transform duration-200",
                expanded && "rotate-180",
              )}
            />
          </Button>
        </div>

        {expanded ? (
          <div className="space-y-3 border-t border-border px-4 py-3 pr-12">
            {article.excerpt ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {article.excerpt}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">No preview available.</p>
            )}
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
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
              {article.updated_by_name ? <span aria-hidden>·</span> : null}
              <time dateTime={article.updated_at}>
                Updated{" "}
                {new Date(article.updated_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </time>
            </div>
            <Link
              href={articleHref}
              className="inline-block text-sm font-medium text-primary hover:underline"
            >
              Read article
            </Link>
          </div>
        ) : null}

        {canEdit ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute bottom-2 right-2 text-muted-foreground hover:text-foreground"
            render={<Link href={editHref} aria-label={`Edit ${article.title}`} />}
          >
            <Pencil className="size-3.5" />
          </Button>
        ) : null}
      </div>
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
      <ul className="grid gap-2">
        {items.map((article) => (
          <li
            key={article.id}
            draggable={sortable && !isPending}
            onDragStart={() => setDragId(article.id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => handleDrop(article.id)}
          >
            <ArticleRow
              article={article}
              categorySlug={categorySlug}
              sortable={sortable}
              canEdit={canEdit}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
