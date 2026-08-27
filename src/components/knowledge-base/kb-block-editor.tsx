"use client";

import { useEffect, useRef, useState } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createEmptyBlock } from "@/lib/knowledge-base/blocks";
import type { KbBlock, KbBlockType } from "@/lib/knowledge-base/types";
import { cn } from "@/lib/utils";

const SLASH_OPTIONS: Array<{ type: KbBlockType; label: string }> = [
  { type: "paragraph", label: "Text" },
  { type: "heading1", label: "Heading 1" },
  { type: "heading2", label: "Heading 2" },
  { type: "heading3", label: "Heading 3" },
  { type: "bullet_list", label: "Bullet list" },
  { type: "numbered_list", label: "Numbered list" },
  { type: "code", label: "Code" },
  { type: "link", label: "Link" },
  { type: "image", label: "Image" },
  { type: "divider", label: "Divider" },
];

type KbBlockEditorProps = {
  blocks: KbBlock[];
  onChange: (blocks: KbBlock[]) => void;
  onUploadImage?: (file: File) => Promise<string | null>;
  disabled?: boolean;
};

export function KbBlockEditor({
  blocks,
  onChange,
  onUploadImage,
  disabled = false,
}: KbBlockEditorProps) {
  const [slashIndex, setSlashIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setSlashIndex(null);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function updateBlock(index: number, patch: Partial<KbBlock>) {
    onChange(
      blocks.map((block, i) => (i === index ? { ...block, ...patch } : block)),
    );
  }

  function replaceBlockType(index: number, type: KbBlockType) {
    const next = createEmptyBlock(type);
    next.id = blocks[index]?.id ?? next.id;
    onChange(blocks.map((block, i) => (i === index ? next : block)));
    setSlashIndex(null);
  }

  function insertBlock(index: number, type: KbBlockType = "paragraph") {
    const next = [...blocks];
    next.splice(index + 1, 0, createEmptyBlock(type));
    onChange(next);
  }

  function removeBlock(index: number) {
    if (blocks.length <= 1) {
      onChange([createEmptyBlock("paragraph")]);
      return;
    }
    onChange(blocks.filter((_, i) => i !== index));
  }

  function handleTextInput(
    index: number,
    value: string,
    onSlash?: (open: boolean) => void,
  ) {
    if (value.startsWith("/")) {
      onSlash?.(true);
      updateBlock(index, { content: value.slice(1) });
      return;
    }
    onSlash?.(false);
    updateBlock(index, { content: value });
  }

  return (
    <div ref={containerRef} className="space-y-3">
      {blocks.map((block, index) => (
        <div key={block.id} className="group relative flex gap-2">
          <div className="flex flex-col gap-1 pt-1 opacity-0 transition group-hover:opacity-100">
            <button
              type="button"
              className="rounded p-1 text-muted-foreground hover:bg-muted"
              aria-label="Drag handle"
              disabled
            >
              <GripVertical className="size-4" />
            </button>
            <button
              type="button"
              className="rounded p-1 text-muted-foreground hover:bg-muted"
              aria-label="Add block below"
              disabled={disabled}
              onClick={() => insertBlock(index)}
            >
              <Plus className="size-4" />
            </button>
            <button
              type="button"
              className="rounded p-1 text-muted-foreground hover:bg-muted"
              aria-label="Remove block"
              disabled={disabled}
              onClick={() => removeBlock(index)}
            >
              <Trash2 className="size-4" />
            </button>
          </div>

          <div className="min-w-0 flex-1">
            {block.type === "divider" ? (
              <hr className="my-4 border-border" />
            ) : null}

            {block.type === "bullet_list" || block.type === "numbered_list" ? (
              <div className="space-y-2">
                {(block.items ?? [""]).map((item, itemIndex) => (
                  <div key={`${block.id}-${itemIndex}`} className="flex gap-2">
                    <span className="pt-2 text-sm text-muted-foreground">
                      {block.type === "numbered_list" ? `${itemIndex + 1}.` : "•"}
                    </span>
                    <Input
                      value={item}
                      disabled={disabled}
                      placeholder="List item"
                      onChange={(event) => {
                        const items = [...(block.items ?? [""])];
                        items[itemIndex] = event.target.value;
                        updateBlock(index, { items });
                      }}
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
                  onClick={() =>
                    updateBlock(index, {
                      items: [...(block.items ?? []), ""],
                    })
                  }
                >
                  Add item
                </Button>
              </div>
            ) : null}

            {block.type === "link" ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  value={block.text ?? ""}
                  disabled={disabled}
                  placeholder="Link label"
                  onChange={(event) =>
                    updateBlock(index, { text: event.target.value })
                  }
                />
                <Input
                  value={block.content ?? ""}
                  disabled={disabled}
                  placeholder="https://"
                  onChange={(event) =>
                    updateBlock(index, { content: event.target.value })
                  }
                />
              </div>
            ) : null}

            {block.type === "image" ? (
              <div className="space-y-2">
                {block.src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={block.src}
                    alt={block.alt ?? ""}
                    className="max-h-64 rounded-lg border border-border object-contain"
                  />
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Input
                    value={block.alt ?? ""}
                    disabled={disabled}
                    placeholder="Alt text"
                    onChange={(event) =>
                      updateBlock(index, { alt: event.target.value })
                    }
                  />
                  <Input
                    type="file"
                    accept="image/*"
                    disabled={disabled || !onUploadImage}
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file || !onUploadImage) return;
                      const src = await onUploadImage(file);
                      if (src) updateBlock(index, { src });
                    }}
                  />
                </div>
              </div>
            ) : null}

            {[
              "paragraph",
              "heading1",
              "heading2",
              "heading3",
              "code",
            ].includes(block.type) ? (
              <div className="relative">
                <textarea
                  value={block.content ?? ""}
                  disabled={disabled}
                  rows={block.type === "code" ? 6 : block.type === "paragraph" ? 3 : 2}
                  placeholder={
                    block.type === "code"
                      ? "Code…"
                      : "Type / for commands…"
                  }
                  onChange={(event) =>
                    handleTextInput(index, event.target.value, (open) =>
                      setSlashIndex(open ? index : null),
                    )
                  }
                  className={cn(
                    "w-full resize-y rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                    block.type === "heading1" && "text-2xl font-semibold",
                    block.type === "heading2" && "text-xl font-semibold",
                    block.type === "heading3" && "text-lg font-semibold",
                    block.type === "code" && "font-mono",
                  )}
                />
                {slashIndex === index ? (
                  <div className="absolute left-0 top-full z-10 mt-1 w-56 overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
                    {SLASH_OPTIONS.map((option) => (
                      <button
                        key={option.type}
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => replaceBlockType(index, option.type)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
