"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { KbVersionHistory } from "@/components/knowledge-base/kb-version-history";
import type { KbArticleVersionRow } from "@/lib/knowledge-base/types";
import { cn } from "@/lib/utils";

type KbVersionHistoryCollapsibleProps = {
  versions: KbArticleVersionRow[];
};

export function KbVersionHistoryCollapsible({
  versions,
}: KbVersionHistoryCollapsibleProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium hover:bg-muted/40"
      >
        <span>Version history ({versions.length})</span>
        <ChevronDown
          className={cn("size-4 text-muted-foreground transition", open && "rotate-180")}
        />
      </button>
      {open ? (
        <div className="border-t border-border p-4">
          <KbVersionHistory versions={versions} />
        </div>
      ) : null}
    </div>
  );
}
