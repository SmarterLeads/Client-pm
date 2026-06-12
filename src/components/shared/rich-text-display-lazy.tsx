"use client";

import dynamic from "next/dynamic";

export const RichTextDisplay = dynamic(
  () =>
    import("@/components/shared/rich-text-display").then(
      (mod) => mod.RichTextDisplay,
    ),
  { ssr: false },
);
