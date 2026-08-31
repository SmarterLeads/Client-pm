"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createArticle } from "@/lib/actions/knowledge-base";
import type { KbCategoryRow, KbSubcategoryRow } from "@/lib/knowledge-base/types";
import { toastError } from "@/lib/toast";

type KbNewArticleFormProps = {
  categories: KbCategoryRow[];
  subcategories: KbSubcategoryRow[];
  defaultCategorySlug?: string;
  defaultSubcategorySlug?: string;
};

export function KbNewArticleForm({
  categories,
  subcategories,
  defaultCategorySlug,
  defaultSubcategorySlug,
}: KbNewArticleFormProps) {
  const defaultCategory =
    categories.find((category) => category.slug === defaultCategorySlug) ??
    categories[0];

  const defaultSubcategoryId = useMemo(() => {
    if (!defaultCategory || !defaultSubcategorySlug || defaultSubcategorySlug === "general") {
      return "";
    }
    return (
      subcategories.find(
        (sub) =>
          sub.parent_id === defaultCategory.id &&
          sub.slug === defaultSubcategorySlug,
      )?.id ?? ""
    );
  }, [defaultCategory, defaultSubcategorySlug, subcategories]);

  const [categoryId, setCategoryId] = useState(defaultCategory?.id ?? "");
  const [subcategoryId, setSubcategoryId] = useState(defaultSubcategoryId);
  const [title, setTitle] = useState("");
  const [isPending, startTransition] = useTransition();

  const categorySubcategories = subcategories.filter(
    (sub) => sub.parent_id === categoryId,
  );

  function handleCategoryChange(nextCategoryId: string) {
    setCategoryId(nextCategoryId);
    setSubcategoryId("");
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createArticle({
        categoryId,
        subcategoryId: subcategoryId || null,
        title,
      });
      if (result.error) {
        toastError(result.error);
      }
    });
  }

  const cancelHref = defaultCategory
    ? defaultSubcategorySlug
      ? `/knowledge-base/${defaultCategory.slug}?sub=${encodeURIComponent(defaultSubcategorySlug)}`
      : `/knowledge-base/${defaultCategory.slug}`
    : "/knowledge-base";

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <div className="space-y-2">
        <Label htmlFor="kb-category">Category</Label>
        <select
          id="kb-category"
          value={categoryId}
          disabled={isPending}
          onChange={(event) => handleCategoryChange(event.target.value)}
          className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm dark:bg-input/30"
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {categorySubcategories.length > 0 ? (
        <div className="space-y-2">
          <Label htmlFor="kb-subcategory">Sub-category</Label>
          <select
            id="kb-subcategory"
            value={subcategoryId}
            disabled={isPending}
            onChange={(event) => setSubcategoryId(event.target.value)}
            className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm dark:bg-input/30"
          >
            <option value="">General</option>
            {categorySubcategories.map((subcategory) => (
              <option key={subcategory.id} value={subcategory.id}>
                {subcategory.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

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
          render={<Link href={cancelHref} />}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
