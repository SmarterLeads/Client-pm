"use client";

import Link from "next/link";

import type { KbBlock } from "@/lib/knowledge-base/types";
import { cn } from "@/lib/utils";

type KbBlockRendererProps = {
  blocks: KbBlock[];
  className?: string;
};

function KbImageBlock({ block }: { block: KbBlock }) {
  if (!block.src?.trim()) {
    return (
      <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        Missing image
      </div>
    );
  }

  return (
    <figure className="space-y-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={block.src}
        alt={block.alt ?? ""}
        className="max-h-[480px] w-full rounded-lg border border-border object-contain"
      />
      {block.alt?.trim() ? (
        <figcaption className="text-center text-xs text-muted-foreground">
          {block.alt}
        </figcaption>
      ) : null}
    </figure>
  );
}

export function KbBlockRenderer({ blocks, className }: KbBlockRendererProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {blocks.map((block) => {
        switch (block.type) {
          case "heading1":
            return (
              <h2 key={block.id} className="text-2xl font-semibold tracking-tight">
                {block.content}
              </h2>
            );
          case "heading2":
            return (
              <h3 key={block.id} className="text-xl font-semibold tracking-tight">
                {block.content}
              </h3>
            );
          case "heading3":
            return (
              <h4 key={block.id} className="text-lg font-semibold tracking-tight">
                {block.content}
              </h4>
            );
          case "bullet_list":
            return (
              <ul key={block.id} className="list-disc space-y-1 pl-6">
                {(block.items ?? []).filter(Boolean).map((item, index) => (
                  <li key={`${block.id}-${index}`}>{item}</li>
                ))}
              </ul>
            );
          case "numbered_list":
            return (
              <ol key={block.id} className="list-decimal space-y-1 pl-6">
                {(block.items ?? []).filter(Boolean).map((item, index) => (
                  <li key={`${block.id}-${index}`}>{item}</li>
                ))}
              </ol>
            );
          case "code":
            return (
              <pre
                key={block.id}
                className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-4 text-sm"
              >
                <code>{block.content}</code>
              </pre>
            );
          case "link":
            return block.content?.trim() ? (
              <p key={block.id}>
                <Link
                  href={block.content}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary underline underline-offset-4"
                >
                  {block.text?.trim() || block.content}
                </Link>
              </p>
            ) : null;
          case "image":
            return <KbImageBlock key={block.id} block={block} />;
          case "divider":
            return <hr key={block.id} className="border-border" />;
          default:
            return block.content?.trim() ? (
              <p key={block.id} className="leading-7 text-foreground/90">
                {block.content}
              </p>
            ) : (
              <div key={block.id} className="h-2" aria-hidden />
            );
        }
      })}
    </div>
  );
}
