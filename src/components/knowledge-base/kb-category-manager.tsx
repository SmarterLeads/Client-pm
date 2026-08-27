"use client";

import { useEffect, useState, useTransition } from "react";
import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  createCategory,
  deleteCategory,
  reorderCategories,
  updateCategory,
} from "@/lib/actions/knowledge-base";
import type { KbCategoryRow } from "@/lib/knowledge-base/types";
import { toastError, toastSuccess } from "@/lib/toast";

type KbCategoryManagerProps = {
  categories: KbCategoryRow[];
};

export function KbCategoryManager({ categories }: KbCategoryManagerProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(categories);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) setItems(categories);
  }, [categories, open]);

  function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    startTransition(async () => {
      const result = await createCategory({ name });
      if (result.error) {
        toastError(result.error);
        return;
      }
      toastSuccess("Category created");
      setNewName("");
      window.location.reload();
    });
  }

  function handleRename(id: string) {
    const name = editingName.trim();
    if (!name) return;
    startTransition(async () => {
      const result = await updateCategory({ id, name });
      if (result.error) {
        toastError(result.error);
        return;
      }
      toastSuccess("Category updated");
      setEditingId(null);
      window.location.reload();
    });
  }

  function handleDelete(id: string) {
    if (!window.confirm("Delete this category?")) return;
    startTransition(async () => {
      const result = await deleteCategory(id);
      if (result.error) {
        toastError(result.error);
        return;
      }
      toastSuccess("Category deleted");
      window.location.reload();
    });
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
      const result = await reorderCategories(next.map((item) => item.id));
      if (result.error) toastError(result.error);
      else toastSuccess("Categories reordered");
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button type="button" variant="outline" />}>
        Manage categories
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Knowledge base categories</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-6">
          <div className="flex gap-2">
            <Input
              value={newName}
              disabled={isPending}
              placeholder="New category name"
              onChange={(event) => setNewName(event.target.value)}
            />
            <Button type="button" disabled={isPending} onClick={handleCreate}>
              <Plus className="size-4" />
              Add
            </Button>
          </div>

          <ul className="divide-y divide-border rounded-lg border border-border">
            {items.map((category) => (
              <li
                key={category.id}
                draggable
                onDragStart={() => setDragId(category.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => handleDrop(category.id)}
                className="flex items-center gap-2 px-3 py-2"
              >
                <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  {editingId === category.id ? (
                    <Input
                      value={editingName}
                      disabled={isPending}
                      onChange={(event) => setEditingName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") handleRename(category.id);
                      }}
                    />
                  ) : (
                    <div>
                      <p className="font-medium">{category.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {category.article_count ?? 0} articles
                      </p>
                    </div>
                  )}
                </div>
                {editingId === category.id ? (
                  <Button
                    type="button"
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleRename(category.id)}
                  >
                    Save
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={isPending}
                      onClick={() => {
                        setEditingId(category.id);
                        setEditingName(category.name);
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={isPending || (category.article_count ?? 0) > 0}
                      onClick={() => handleDelete(category.id)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
}
