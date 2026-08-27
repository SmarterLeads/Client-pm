"use client";

import { Command } from "cmdk";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { BookOpen, Search, X } from "lucide-react";

import { searchKnowledgeBase } from "@/lib/actions/knowledge-base";
import { highlightMatches } from "@/lib/knowledge-base/blocks";
import type { KbSearchResult } from "@/lib/knowledge-base/types";

type KbSearchProps = {
  enableShortcut?: boolean;
};

export function KbSearch({ enableShortcut = true }: KbSearchProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KbSearchResult[]>([]);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!enableShortcut) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [enableShortcut]);

  const runSearch = useCallback((value: string) => {
    setQuery(value);
    if (!value.trim()) {
      setResults([]);
      return;
    }
    startTransition(async () => {
      try {
        const data = await searchKnowledgeBase(value);
        setResults(data);
      } catch {
        setResults([]);
      }
    });
  }, []);

  const grouped = results.reduce<Record<string, KbSearchResult[]>>(
    (acc, result) => {
      if (!acc[result.category_name]) acc[result.category_name] = [];
      acc[result.category_name].push(result);
      return acc;
    },
    {},
  );

  function navigate(result: KbSearchResult) {
    setOpen(false);
    setQuery("");
    setResults([]);
    router.push(`/knowledge-base/${result.category_slug}/${result.slug}`);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative flex h-10 w-full max-w-xl items-center rounded-lg border border-input bg-background px-10 text-left text-sm text-muted-foreground hover:bg-muted/30"
      >
        <Search className="pointer-events-none absolute left-3 size-4" />
        Search knowledge base…
        <kbd className="ml-auto hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium sm:inline">
          ⌘K
        </kbd>
      </button>

      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Knowledge base search"
        overlayClassName="fixed inset-0 z-50 bg-black/50"
        contentClassName="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh] pointer-events-none"
      >
        <div className="pointer-events-auto w-full max-w-xl overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
          <Command shouldFilter={false} className="flex max-h-[70vh] flex-col">
            <div className="flex items-center border-b border-border px-3">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <Command.Input
                value={query}
                onValueChange={runSearch}
                placeholder="Search articles…"
                className="h-12 flex-1 bg-transparent px-3 text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                aria-label="Close search"
              >
                <X className="size-4" />
              </button>
            </div>
            <Command.List className="overflow-y-auto p-2">
              <Command.Empty className="px-3 py-8 text-center text-sm text-muted-foreground">
                {query.trim() ? "No articles found." : "Type to search…"}
              </Command.Empty>
              {Object.entries(grouped).map(([categoryName, items]) => (
                <Command.Group key={categoryName} heading={categoryName}>
                  {items.map((item) => (
                    <Command.Item
                      key={item.id}
                      value={`${item.title} ${item.snippet}`}
                      onSelect={() => navigate(item)}
                      className="flex cursor-pointer gap-3 rounded-md px-3 py-2 text-sm aria-selected:bg-muted"
                    >
                      <BookOpen className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1">
                        <span
                          className="block truncate font-medium"
                          dangerouslySetInnerHTML={{
                            __html: highlightMatches(item.title, query),
                          }}
                        />
                        <span
                          className="mt-0.5 block text-xs text-muted-foreground"
                          dangerouslySetInnerHTML={{
                            __html: highlightMatches(item.snippet, query),
                          }}
                        />
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>
              ))}
            </Command.List>
          </Command>
        </div>
      </Command.Dialog>
    </>
  );
}

export function KbHomeSearchPanel({
  query,
  results,
}: {
  query: string;
  results: KbSearchResult[];
}) {
  if (!query.trim()) return null;
  if (results.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No articles match your search.</p>
    );
  }

  const grouped = results.reduce<Record<string, KbSearchResult[]>>((acc, result) => {
    if (!acc[result.category_name]) acc[result.category_name] = [];
    acc[result.category_name].push(result);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([categoryName, items]) => (
        <section key={categoryName} className="space-y-2">
          <h3 className="text-sm font-semibold">{categoryName}</h3>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/knowledge-base/${item.category_slug}/${item.slug}`}
                  className="block px-4 py-3 hover:bg-muted/40"
                >
                  <span
                    className="font-medium"
                    dangerouslySetInnerHTML={{
                      __html: highlightMatches(item.title, query),
                    }}
                  />
                  <span
                    className="mt-1 block text-sm text-muted-foreground"
                    dangerouslySetInnerHTML={{
                      __html: highlightMatches(item.snippet, query),
                    }}
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
