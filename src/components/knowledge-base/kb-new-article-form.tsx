"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createArticle } from "@/lib/actions/knowledge-base";
import type { KbCategoryRow } from "@/lib/knowledge-base/types";
import { toastError } from "@/lib/toast";

type KbNewArticleFormProps = {
  categories: KbCategoryRow[];
  defaultCategorySlug?: string;
};

export function KbNewArticleForm({
  categories,
  defaultCategorySlug,
}: KbNewArticleFormProps) {
  const router = useRouter();
  const defaultCategory =
    categories.find((category) => category.slug === defaultCategorySlug) ??
    categories[0];
  const [categoryId, setCategoryId] = useState(defaultCategory?.id ?? "");
  const [title, setTitle] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createArticle({ categoryId, title });
      if (result.error) {
        toastError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <div className="space-y-2">
        <Label htmlFor="kb-category">Category</Label>
        <select
          id="kb-category"
          value={categoryId}
          disabled={isPending}
          onChange={(event) => setCategoryId(event.target.value)}
          className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm dark:bg-input/30"
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="kb-title">Title</Label>
        <Input
          id="kb-title"
          value={title}
          disabled={isPending}
          required
          placeholder="Article title"
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending || !title.trim()}>
          {isPending ? "Creating…" : "Create and edit"}
        </Button>
        <Button
          type="button"
          variant="outline"
          render={<Link href="/knowledge-base" />}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
