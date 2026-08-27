import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { KbBlockRenderer } from "@/components/knowledge-base/kb-block-renderer";
import { KbSearch } from "@/components/knowledge-base/kb-search";
import { KbVersionHistory } from "@/components/knowledge-base/kb-version-history";
import { Button } from "@/components/ui/button";
import { canManageKnowledgeBase } from "@/lib/knowledge-base/access";
import { getTeamMember } from "@/lib/auth/session";
import {
  getKbArticleBySlugs,
  getKbArticleVersions,
} from "@/lib/queries/knowledge-base";

type KnowledgeBaseArticlePageProps = {
  params: Promise<{ categorySlug: string; articleSlug: string }>;
};

export default async function KnowledgeBaseArticlePage({
  params,
}: KnowledgeBaseArticlePageProps) {
  const teamMember = await getTeamMember();
  if (!teamMember) redirect("/login");

  const { categorySlug, articleSlug } = await params;
  const article = await getKbArticleBySlugs(categorySlug, articleSlug);
  if (!article) notFound();

  const canEdit = canManageKnowledgeBase(teamMember);
  const versions = canEdit ? await getKbArticleVersions(article.id) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            href={`/knowledge-base/${article.category_slug}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← {article.category_name}
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {article.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Updated {new Date(article.updated_at).toLocaleString()}
            {article.updated_by_name ? ` · ${article.updated_by_name}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-full max-w-xs lg:w-auto">
            <KbSearch />
          </div>
          {canEdit ? (
            <Button
              render={
                <Link
                  href={`/knowledge-base/${article.category_slug}/${article.slug}/edit`}
                />
              }
            >
              Edit
            </Button>
          ) : null}
        </div>
      </div>

      <article className="max-w-3xl">
        <KbBlockRenderer blocks={article.content} />
      </article>

      {canEdit ? (
        <section className="max-w-3xl space-y-3 border-t border-border pt-6">
          <h2 className="text-lg font-semibold">Version history</h2>
          <KbVersionHistory versions={versions} />
        </section>
      ) : null}
    </div>
  );
}
