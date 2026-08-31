import { cn } from "@/lib/utils";

/** Article reading typography — wiki-style prose */
export const kbArticleTypographyClassName = cn(
  "kb-prose text-base leading-relaxed text-foreground",
  "[&_h1]:mb-6 [&_h1]:mt-10 [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h1:first-child]:mt-0",
  "[&_h2]:mb-4 [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:tracking-tight",
  "[&_h3]:mb-3 [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:tracking-tight",
  "[&_p]:mb-4 [&_p]:leading-relaxed",
  "[&_strong]:font-bold [&_b]:font-bold",
  "[&_em]:italic [&_i]:italic",
  "[&_u]:underline",
  "[&_s]:line-through [&_strike]:line-through",
  "[&_ul]:mb-4 [&_ul]:ml-6 [&_ul]:list-disc [&_ul]:space-y-2",
  "[&_ol]:mb-4 [&_ol]:ml-6 [&_ol]:list-decimal [&_ol]:space-y-2",
  "[&_li]:leading-relaxed",
  "[&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-primary/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground",
  "[&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-4 [&_pre]:font-mono [&_pre]:text-sm",
  "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-sm",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
  "[&_hr]:my-8 [&_hr]:border-border",
  "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-primary/80",
  "[&_img]:my-6 [&_img]:max-w-full [&_img]:rounded-lg",
  "[&_figure]:my-6 [&_figcaption]:mt-2 [&_figcaption]:text-center [&_figcaption]:text-sm [&_figcaption]:text-muted-foreground",
  "[&_.text-sm]:text-sm [&_.text-lg]:text-lg [&_.text-xl]:text-xl",
);

/** Editor canvas typography */
export const kbEditorTypographyClassName = cn(
  "min-h-[420px] px-4 py-3 outline-none",
  kbArticleTypographyClassName,
);
