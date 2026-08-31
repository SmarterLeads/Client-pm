"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ChevronRight, Pencil, Trash2 } from "lucide-react";

import { KbArticleContent } from "@/components/knowledge-base/kb-article-content";
import { KbSearch } from "@/components/knowledge-base/kb-search";
import { KbVersionHistoryCollapsible } from "@/components/knowledge-base/kb-version-history-collapsible";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteArticle } from "@/lib/actions/knowledge-base";
import type { KbArticleDetail, KbArticleVersionRow } from "@/lib/knowledge-base/types";
import { toastError, toastSuccess } from "@/lib/toast";

type KbArticleViewProps = {
  article: KbArticleDetail;
  versions: KbArticleVersionRow[];
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

export function KbArticleView({ article, versions, canEdit }: KbArticleViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm("Delete this article permanently?")) return;
    startTransition(async () => {
      const result = await deleteArticle(article.id);
      if (result.error) {
        toastError(result.error);
        return;
      }
      toastSuccess("Article deleted");
      router.push("/knowledge-base");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <nav className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/knowledge-base" className="hover:text-foreground">
          Knowledge Base
        </Link>
        <ChevronRight className="size-3.5" />
        <Link
          href={`/knowledge-base/${article.category_slug}`}
          className="hover:text-foreground"
        >
          {article.category_name}
        </Link>
      </nav>

      <header className="flex flex-col gap-6 border-b border-border pb-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          <Badge variant="secondary" className="font-normal">
            {article.category_name}
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            {article.title}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {article.updated_by_name ? (
              <span className="flex items-center gap-2">
                <Avatar size="sm">
                  <AvatarFallback className="text-[10px]">
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
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </time>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-full min-w-[200px] sm:w-auto">
            <KbSearch />
          </div>
          {canEdit ? (
            <>
              <Button
                variant="outline"
                size="sm"
                render={
                  <Link
                    href={`/knowledge-base/${article.category_slug}/${article.slug}/edit`}
                  />
                }
              >
                <Pencil className="size-4" />
                Edit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={isPending}
                onClick={handleDelete}
              >
                <Trash2 className="size-4" />
                Delete
              </Button>
            </>
          ) : null}
        </div>
      </header>

      <article className="mx-auto max-w-4xl">
        <KbArticleContent blocks={article.content} />
      </article>

      {canEdit ? (
        <div className="mx-auto max-w-4xl border-t border-border pt-6">
          <KbVersionHistoryCollapsible versions={versions} />
        </div>
      ) : null}
    </div>
  );
}
