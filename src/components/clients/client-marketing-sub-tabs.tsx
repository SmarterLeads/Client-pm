"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const subTabs = [
  { id: "internal", label: "Internal" },
  { id: "client", label: "Client report" },
  { id: "ai-insights", label: "🤖 AI Insights" },
] as const;

export function ClientMarketingSubTabs() {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const current = searchParams?.get("marketingSub") ?? "internal";

  function hrefFor(sub: string) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("tab", "marketing");
    params.set("marketingSub", sub);
    return `${pathname}?${params.toString()}`;
  }

  return (
    <nav className="flex flex-wrap gap-1 border-b border-border pb-2">
      {subTabs.map((tab) => (
        <Link
          key={tab.id}
          href={hrefFor(tab.id)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            current === tab.id
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
