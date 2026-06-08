"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { searchGlobal } from "@/lib/actions/search";
import type { GlobalSearchResults, SearchResultItem } from "@/lib/queries/search";
import {
  Building2,
  CheckSquare,
  FolderKanban,
  Search,
  Users,
  X,
} from "lucide-react";

const RECENT_SEARCHES_KEY = "pm-recent-searches";
const MAX_RECENT = 5;

const EMPTY_RESULTS: GlobalSearchResults = {
  clients: [],
  projects: [],
  tasks: [],
  team_members: [],
};

function loadRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === "string").slice(0, MAX_RECENT)
      : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return;
  const recent = loadRecentSearches().filter((item) => item !== trimmed);
  recent.unshift(trimmed);
  localStorage.setItem(
    RECENT_SEARCHES_KEY,
    JSON.stringify(recent.slice(0, MAX_RECENT)),
  );
}

type ResultGroupProps = {
  heading: string;
  icon: React.ReactNode;
  items: SearchResultItem[];
  onSelect: (href: string, title: string) => void;
};

function ResultGroup({ heading, icon, items, onSelect }: ResultGroupProps) {
  if (items.length === 0) return null;

  return (
    <Command.Group heading={heading}>
      {items.map((item) => (
        <Command.Item
          key={`${heading}-${item.id}`}
          value={`${heading} ${item.title} ${item.subtitle}`}
          onSelect={() => onSelect(item.href, item.title)}
          className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm aria-selected:bg-muted"
        >
          <span className="text-muted-foreground">{icon}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{item.title}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {item.subtitle}
            </span>
          </span>
        </Command.Item>
      ))}
    </Command.Group>
  );
}

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResults>(EMPTY_RESULTS);
  const [recent, setRecent] = useState<string[]>([]);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setRecent(loadRecentSearches());
  }, [open]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const runSearch = useCallback((value: string) => {
    setQuery(value);
    if (!value.trim()) {
      setResults(EMPTY_RESULTS);
      return;
    }

    startTransition(async () => {
      try {
        const data = await searchGlobal(value);
        setResults(data);
      } catch {
        setResults(EMPTY_RESULTS);
      }
    });
  }, []);

  function closeSearch() {
    setOpen(false);
  }

  function navigate(href: string, title: string) {
    if (query.trim()) {
      saveRecentSearch(query.trim());
    } else if (title.trim()) {
      saveRecentSearch(title.trim());
    }
    setOpen(false);
    setQuery("");
    setResults(EMPTY_RESULTS);
    router.push(href);
  }

  const hasResults =
    results.clients.length > 0 ||
    results.projects.length > 0 ||
    results.tasks.length > 0 ||
    results.team_members.length > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden h-8 w-full max-w-sm items-center gap-2 rounded-lg border border-input bg-muted/30 px-3 text-sm text-muted-foreground hover:bg-muted/50 lg:flex"
      >
        <Search className="size-4 shrink-0" aria-hidden />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="hidden rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium sm:inline">
          Ctrl K
        </kbd>
      </button>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex size-9 items-center justify-center rounded-md hover:bg-muted lg:hidden"
        aria-label="Search"
      >
        <Search className="size-5" />
      </button>

      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Global search"
        overlayClassName="fixed inset-0 z-50 bg-black/50"
        contentClassName="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh] pointer-events-none"
      >
        <div className="pointer-events-auto w-full max-w-xl overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
          <Command
            shouldFilter={false}
            className="flex max-h-[70vh] flex-col"
          >
            <div className="flex items-center border-b border-border px-3">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <Command.Input
                value={query}
                onValueChange={runSearch}
                placeholder="Search clients, projects, tasks, team…"
                className="h-12 flex-1 bg-transparent px-3 text-sm outline-none"
              />
              <button
                type="button"
                onClick={closeSearch}
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Close search"
              >
                <X className="size-4" />
              </button>
            </div>

            <Command.List className="overflow-y-auto p-2">
              <Command.Empty className="px-3 py-8 text-center text-sm text-muted-foreground">
                {query.trim() ? "No results found." : "Type to search…"}
              </Command.Empty>

              {!query.trim() && recent.length > 0 ? (
                <Command.Group heading="Recent searches">
                  {recent.map((item) => (
                    <Command.Item
                      key={item}
                      value={`recent ${item}`}
                      onSelect={() => runSearch(item)}
                      className="cursor-pointer rounded-md px-3 py-2 text-sm aria-selected:bg-muted"
                    >
                      {item}
                    </Command.Item>
                  ))}
                </Command.Group>
              ) : null}

              {hasResults ? (
                <>
                  <ResultGroup
                    heading="Clients"
                    icon={<Building2 className="size-4" />}
                    items={results.clients}
                    onSelect={navigate}
                  />
                  <ResultGroup
                    heading="Projects"
                    icon={<FolderKanban className="size-4" />}
                    items={results.projects}
                    onSelect={navigate}
                  />
                  <ResultGroup
                    heading="Tasks"
                    icon={<CheckSquare className="size-4" />}
                    items={results.tasks}
                    onSelect={navigate}
                  />
                  <ResultGroup
                    heading="Team"
                    icon={<Users className="size-4" />}
                    items={results.team_members}
                    onSelect={navigate}
                  />
                </>
              ) : null}
            </Command.List>
          </Command>
        </div>
      </Command.Dialog>
    </>
  );
}
