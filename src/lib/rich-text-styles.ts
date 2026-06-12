import { cn } from "@/lib/utils";

export const richTextTypographyClassName = cn(
  "space-y-3 text-sm leading-relaxed text-foreground",
  "[&_h1]:text-xl [&_h1]:font-semibold [&_h1]:tracking-tight",
  "[&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight",
  "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:tracking-tight",
  "[&_p]:leading-relaxed",
  "[&_strong]:font-semibold [&_b]:font-semibold",
  "[&_em]:italic [&_i]:italic",
  "[&_u]:underline",
  "[&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5",
  "[&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5",
  "[&_li]:leading-relaxed",
  "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_blockquote]:italic",
  "[&_hr]:border-border",
);
