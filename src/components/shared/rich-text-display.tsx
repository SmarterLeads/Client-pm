"use client";

import DOMPurify from "dompurify";
import { FormattedText } from "@/components/shared/formatted-text";
import { richTextTypographyClassName } from "@/lib/rich-text-styles";
import { isRichTextHtml } from "@/lib/rich-text";
import { cn } from "@/lib/utils";

export { richTextTypographyClassName } from "@/lib/rich-text-styles";

function sanitizeRichTextHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "h1",
      "h2",
      "h3",
      "ul",
      "ol",
      "li",
      "blockquote",
      "hr",
    ],
    ALLOWED_ATTR: [],
  });
}

export type RichTextDisplayProps = {
  children: string;
  className?: string;
};

export function RichTextDisplay({ children, className }: RichTextDisplayProps) {
  const trimmed = children.trim();
  if (!trimmed) return null;

  if (!isRichTextHtml(trimmed)) {
    return <FormattedText className={className}>{trimmed}</FormattedText>;
  }

  const sanitized = sanitizeRichTextHtml(trimmed);
  if (!sanitized.trim()) return null;

  return (
    <div
      className={cn(richTextTypographyClassName, className)}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
