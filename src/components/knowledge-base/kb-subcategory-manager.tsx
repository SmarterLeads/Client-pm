"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createSubcategory,
  deleteSubcategory,
} from "@/lib/actions/knowledge-base";
import type { KbSubcategoryRow } from "@/lib/knowledge-base/types";
import { toastError, toastSuccess } from "@/lib/toast";

type KbSubcategoryManagerProps = {
  parentCategoryId: string;
  subcategories: KbSubcategoryRow[];
  articleCountBySubcategoryId: Record<string, number>;
};

export function KbSubcategoryManager({
  parentCategoryId,
  subcategories,
  articleCountBySubcategoryId,
}: KbSubcategoryManagerProps) {
  const [newName, setNewName] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    startTransition(async () => {
      const result = await createSubcategory({ parentId: parentCategoryId, name });
      if (result.error) {
        toastError(result.error);
        return;
      }
      toastSuccess("Sub-category created");
      setNewName("");
      window.location.reload();
    });
  }

  function handleDelete(id: string) {
    if (!window.confirm("Delete this sub-category?")) return;
    startTransition(async () => {
      const result = await deleteSubcategory(id);
      if (result.error) {
        toastError(result.error);
        return;
      }
      toastSuccess("Sub-category deleted");
      window.location.reload();
    });
  }

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <p className="text-sm font-medium">Manage sub-categories</p>
      <div className="mt-3 flex gap-2">
        <Input
          value={newName}
          disabled={isPending}
          placeholder="New sub-category name"
          onChange={(event) => setNewName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleCreate();
            }
          }}
        />
        <Button type="button" disabled={isPending} onClick={handleCreate}>
          <Plus className="size-4" />
          Add
        </Button>
      </div>
      {subcategories.length > 0 ? (
        <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-card">
          {subcategories.map((subcategory) => {
            const count = articleCountBySubcategoryId[subcategory.id] ?? 0;
            return (
              <li
                key={subcategory.id}
                className="flex items-center justify-between gap-2 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{subcategory.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {count} {count === 1 ? "article" : "articles"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={isPending || count > 0}
                  onClick={() => handleDelete(subcategory.id)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          No sub-categories yet. Articles without a sub-category appear under General.
        </p>
      )}
    </div>
  );
}
