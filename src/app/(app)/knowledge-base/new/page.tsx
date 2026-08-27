import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { KbNewArticleForm } from "@/components/knowledge-base/kb-new-article-form";
import { canManageKnowledgeBase } from "@/lib/knowledge-base/access";
import { getTeamMember } from "@/lib/auth/session";
import { getKbCategories } from "@/lib/queries/knowledge-base";

export default async function KnowledgeBaseNewArticlePage() {
  const teamMember = await getTeamMember();
  if (!teamMember) redirect("/login");
  if (!canManageKnowledgeBase(teamMember)) redirect("/knowledge-base");

  const categories = await getKbCategories();
  if (categories.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">New article</h1>
        <p className="text-sm text-muted-foreground">
          Create a category before adding articles.
        </p>
        <Link href="/knowledge-base" className="text-sm text-primary underline">
          Back to knowledge base
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/knowledge-base"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Knowledge base
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">New article</h1>
      </div>
      <KbNewArticleForm categories={categories} />
    </div>
  );
}
