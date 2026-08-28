import Link from "next/link";
import { Fragment } from "react";

import { renderKbInlineText } from "@/lib/knowledge-base/inline-text";
import type { KbBlock } from "@/lib/knowledge-base/types";
import { cn } from "@/lib/utils";

type ArticleRendererProps = {
  blocks: KbBlock[];
  className?: string;
};

function KbParagraph({ content }: { content: string }) {
  const lines = content.split("\n");

  if (lines.length <= 1) {
    return (
      <p className="mb-4 text-base leading-relaxed text-foreground">
        {renderKbInlineText(content)}
      </p>
    );
  }

  return (
    <>
      {lines.map((line, index) => (
        <p
          key={`${index}-${line.slice(0, 12)}`}
          className="mb-4 text-base leading-relaxed text-foreground last:mb-4"
        >
          {line.trim() ? renderKbInlineText(line) : "\u00A0"}
        </p>
      ))}
    </>
  );
}

function KbImageBlock({ block }: { block: KbBlock }) {
  if (!block.src?.trim()) {
    return (
      <div className="my-4 rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-muted-foreground">
        Missing image
      </div>
    );
  }

  return (
    <figure className="my-6 space-y-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={block.src}
        alt={block.alt ?? ""}
        className="mx-auto max-w-full rounded-lg"
      />
      {block.alt?.trim() ? (
        <figcaption className="text-center text-sm text-muted-foreground">
          {block.alt}
        </figcaption>
      ) : null}
    </figure>
  );
}

function renderBlock(block: KbBlock) {
  switch (block.type) {
    case "heading1":
      return (
        <h1 className="mb-6 text-3xl font-bold tracking-tight text-foreground">
          {renderKbInlineText(block.content ?? "")}
        </h1>
      );

    case "heading2":
      return (
        <h2 className="mb-4 text-2xl font-bold tracking-tight text-foreground">
          {renderKbInlineText(block.content ?? "")}
        </h2>
      );

    case "heading3":
      return (
        <h3 className="mb-4 text-xl font-bold tracking-tight text-foreground">
          {renderKbInlineText(block.content ?? "")}
        </h3>
      );

    case "bullet_list": {
      const items = (block.items ?? []).filter((item) => item.trim());
      if (items.length === 0) return null;
      return (
        <ul className="mb-6 ml-6 list-disc space-y-2 text-base leading-relaxed text-foreground">
          {items.map((item, index) => (
            <li key={`${block.id}-${index}`}>{renderKbInlineText(item)}</li>
          ))}
        </ul>
      );
    }

    case "numbered_list": {
      const items = (block.items ?? []).filter((item) => item.trim());
      if (items.length === 0) return null;
      return (
        <ol className="mb-6 ml-6 list-decimal space-y-2 text-base leading-relaxed text-foreground">
          {items.map((item, index) => (
            <li key={`${block.id}-${index}`}>{renderKbInlineText(item)}</li>
          ))}
        </ol>
      );
    }

    case "code":
      return (
        <pre className="mb-4 overflow-x-auto rounded bg-gray-100 p-4 font-mono text-sm text-foreground dark:bg-muted/50">
          <code>{block.content ?? ""}</code>
        </pre>
      );

    case "link":
      if (!block.content?.trim()) return null;
      return (
        <p className="mb-4 text-base leading-relaxed">
          <Link
            href={block.content}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline underline-offset-2 hover:text-blue-700"
          >
            {block.text?.trim()
              ? renderKbInlineText(block.text)
              : block.content}
          </Link>
        </p>
      );

    case "image":
      return <KbImageBlock block={block} />;

    case "divider":
      return <hr className="my-6 border-t border-gray-200 dark:border-border" />;

    case "paragraph":
    default: {
      const content = block.content?.trim() ?? "";
      if (!content) {
        return <div className="h-3" aria-hidden />;
      }
      return <KbParagraph content={block.content ?? ""} />;
    }
  }
}

export function ArticleRenderer({ blocks, className }: ArticleRendererProps) {
  if (!blocks.length) {
    return (
      <p className="text-sm text-muted-foreground">This article has no content yet.</p>
    );
  }

  return (
    <div className={cn("kb-article-content space-y-1", className)}>
      {blocks.map((block) => (
        <Fragment key={block.id}>{renderBlock(block)}</Fragment>
      ))}
    </div>
  );
}

/** @deprecated Use ArticleRenderer */
export const KbBlockRenderer = ArticleRenderer;
