"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { KbBlockEditor } from "@/components/knowledge-base/kb-block-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  deleteArticle,
  updateArticle,
  uploadKbImage,
} from "@/lib/actions/knowledge-base";
import type { KbArticleDetail } from "@/lib/knowledge-base/types";
import type { KbCategoryRow } from "@/lib/knowledge-base/types";
import { toastError, toastSuccess } from "@/lib/toast";

type KbArticleEditorProps = {
  article: KbArticleDetail;
  categories: KbCategoryRow[];
};

export function KbArticleEditor({ article, categories }: KbArticleEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(article.title);
  const [categoryId, setCategoryId] = useState(article.category_id ?? "");
  const [blocks, setBlocks] = useState(article.content);
  const [isPending, startTransition] = useTransition();
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const dirtyRef = useRef(false);

  useEffect(() => {
    dirtyRef.current = true;
  }, [title, categoryId, blocks]);

  const save = useCallback(() => {
    startTransition(async () => {
      const result = await updateArticle({
        id: article.id,
        title,
        categoryId: categoryId || null,
        content: blocks,
      });
      if (result.error) {
        toastError(result.error);
        return;
      }
      dirtyRef.current = false;
      setLastSavedAt(new Date().toLocaleTimeString());
      toastSuccess("Article saved");
      router.refresh();
    });
  }, [article.id, blocks, categoryId, router, title]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (dirtyRef.current && !isPending) {
        save();
      }
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [isPending, save]);

  async function handleUploadImage(file: File) {
    const formData = new FormData();
    formData.set("file", file);
    formData.set("articleId", article.id);
    const result = await uploadKbImage(formData);
    if (result.error) {
      toastError(result.error);
      return null;
    }
    return result.src ?? null;
  }

  function handleDelete() {
    if (!window.confirm("Delete this article?")) return;
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {article.category_name} · Auto-saves every 30 seconds
          </p>
          {lastSavedAt ? (
            <p className="text-xs text-muted-foreground">
              Last saved at {lastSavedAt}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            render={
              <Link
                href={`/knowledge-base/${article.category_slug}/${article.slug}`}
              />
            }
          >
            View
          </Button>
          <Button type="button" variant="destructive" disabled={isPending} onClick={handleDelete}>
            Delete
          </Button>
          <Button type="button" disabled={isPending} onClick={save}>
            {isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_220px]">
        <Input
          value={title}
          disabled={isPending}
          onChange={(event) => setTitle(event.target.value)}
          className="text-2xl font-semibold"
          placeholder="Article title"
        />
        <select
          value={categoryId}
          disabled={isPending}
          onChange={(event) => setCategoryId(event.target.value)}
          className="h-10 rounded-lg border border-input bg-transparent px-3 text-sm dark:bg-input/30"
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <KbBlockEditor
        blocks={blocks}
        onChange={setBlocks}
        onUploadImage={handleUploadImage}
        disabled={isPending}
      />
    </div>
  );
}
