"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

const subTabs = [
  { id: "internal", label: "Internal Dashboard" },
  { id: "client", label: "Client Dashboard" },
] as const;

export type ClientMarketingSubTabId = (typeof subTabs)[number]["id"];

export function ClientMarketingSubTabs() {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const activeSub =
    (searchParams.get("marketingSub") as ClientMarketingSubTabId) || "internal";

  const preservedKeys = ["range", "start", "end", "view"] as const;

  return (
    <nav
      className="flex gap-1 overflow-x-auto border-b border-border"
      aria-label="Marketing views"
    >
      {subTabs.map((tab) => {
        const params = new URLSearchParams();
        params.set("tab", "marketing");
        params.set("marketingSub", tab.id);

        for (const key of preservedKeys) {
          const value = searchParams.get(key);
          if (value) params.set(key, value);
        }

        const href = `${pathname}?${params.toString()}`;

        return (
          <Link
            key={tab.id}
            href={href}
            className={cn(
              "shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              activeSub === tab.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
