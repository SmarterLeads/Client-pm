import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getTeamMember } from "@/lib/auth/session";
import { getKbArticlesByCategory } from "@/lib/queries/knowledge-base";

type KnowledgeBaseCategoryPageProps = {
  params: Promise<{ categorySlug: string }>;
};

export default async function KnowledgeBaseCategoryPage({
  params,
}: KnowledgeBaseCategoryPageProps) {
  const teamMember = await getTeamMember();
  if (!teamMember) redirect("/login");

  const { categorySlug } = await params;
  const result = await getKbArticlesByCategory(categorySlug);
  if (!result) notFound();

  const { category, articles } = result;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/knowledge-base"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Knowledge base
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {category.name}
        </h1>
        {category.description ? (
          <p className="text-sm text-muted-foreground">{category.description}</p>
        ) : null}
      </div>

      {articles.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No articles in this category yet.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {articles.map((article) => (
            <li key={article.id}>
              <Link
                href={`/knowledge-base/${category.slug}/${article.slug}`}
                className="block px-4 py-4 hover:bg-muted/40"
              >
                <p className="font-medium">{article.title}</p>
                {article.excerpt ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {article.excerpt}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-muted-foreground">
                  Updated {new Date(article.updated_at).toLocaleDateString()}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
