"use client";

import DOMPurify from "dompurify";
import { useMemo } from "react";

import { ArticleRenderer } from "@/components/knowledge-base/article-renderer";
import { blocksToHtml } from "@/lib/knowledge-base/html-content";
import { kbArticleTypographyClassName } from "@/lib/knowledge-base/kb-typography";
import type { KbBlock } from "@/lib/knowledge-base/types";
import { cn } from "@/lib/utils";

export type KbTocItem = {
  id: string;
  text: string;
  level: number;
};

function slugifyHeading(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 48) || "section"
  );
}

export function extractTocFromHtml(html: string): { html: string; headings: KbTocItem[] } {
  const headings: KbTocItem[] = [];
  let index = 0;

  const withIds = html.replace(
    /<(h[1-3])([^>]*)>([\s\S]*?)<\/\1>/gi,
    (_match, tag: string, attrs: string, inner: string) => {
      const level = Number(tag.charAt(1));
      const text = inner.replace(/<[^>]+>/g, "").trim();
      if (!text) return _match;

      const id = `kb-section-${index++}-${slugifyHeading(text)}`;
      headings.push({ id, text, level });

      const attrsWithoutId = attrs.replace(/\sid="[^"]*"/i, "");
      return `<${tag}${attrsWithoutId} id="${id}">${inner}</${tag}>`;
    },
  );

  return { html: withIds, headings };
}

type KbArticleContentProps = {
  blocks: KbBlock[];
  className?: string;
  showToc?: boolean;
};

export function KbArticleContent({
  blocks,
  className,
  showToc = true,
}: KbArticleContentProps) {
  const htmlBlock = blocks.find((block) => block.type === "html");
  const isRichHtml = Boolean(htmlBlock?.content?.trim());

  const { sanitizedHtml, headings } = useMemo(() => {
    if (!isRichHtml) {
      return { sanitizedHtml: "", headings: [] as KbTocItem[] };
    }

    const raw = blocksToHtml(blocks);
    const { html, headings: toc } = extractTocFromHtml(raw);
    const sanitized = DOMPurify.sanitize(html, {
      ADD_ATTR: ["target", "rel", "id"],
    });

    return { sanitizedHtml: sanitized, headings: toc };
  }, [blocks, isRichHtml]);

  if (!isRichHtml) {
    return <ArticleRenderer blocks={blocks} className={className} />;
  }

  const showTocPanel = showToc && headings.length >= 3;

  return (
    <div
      className={cn(
        showTocPanel ? "grid gap-10 lg:grid-cols-[minmax(0,1fr)_220px]" : "",
        className,
      )}
    >
      <div
        className={kbArticleTypographyClassName}
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />

      {showTocPanel ? (
        <aside className="hidden lg:block">
          <nav
            aria-label="Table of contents"
            className="sticky top-6 rounded-lg border border-border bg-muted/20 p-4"
          >
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              On this page
            </p>
            <ul className="space-y-2 text-sm">
              {headings.map((item) => (
                <li
                  key={item.id}
                  style={{ paddingLeft: `${(item.level - 1) * 0.75}rem` }}
                >
                  <a
                    href={`#${item.id}`}
                    className="text-muted-foreground transition hover:text-foreground"
                  >
                    {item.text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      ) : null}
    </div>
  );
}
