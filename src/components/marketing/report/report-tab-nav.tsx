import Link from "next/link";

import type { ReportTabItem } from "@/lib/marketing/report/report-tab-platform";

type Props = {
  clientSlug: string;
  range: string;
  start?: string;
  end?: string;
  primaryColor: string;
  activeSlug: string;
  platformTabs: ReportTabItem[];
  /** When false, the Overview tab is omitted (e.g. single-platform client — only platform tabs show). */
  showOverviewTab?: boolean;
  /** Override link base (e.g. `/clients/[id]` when embedded on client detail). */
  navBasePath?: string;
  /** Query params preserved on tab navigation (e.g. tab=marketing). */
  navPreservedQuery?: Record<string, string>;
};

function hrefForTab(
  clientSlug: string,
  range: string,
  start: string | undefined,
  end: string | undefined,
  view: string,
  omitViewSlug: string | null,
  navBasePath?: string,
  navPreservedQuery?: Record<string, string>,
) {
  const q = new URLSearchParams();
  if (navPreservedQuery) {
    for (const [key, value] of Object.entries(navPreservedQuery)) {
      q.set(key, value);
    }
  }
  q.set("range", range);
  if (range === "custom" && start && end) {
    q.set("start", start);
    q.set("end", end);
  }
  const shouldOmitView = omitViewSlug != null && view === omitViewSlug;
  if (!shouldOmitView && view !== "overview") q.set("view", view);
  const base = navBasePath ?? `/marketing/${clientSlug}`;
  return `${base}?${q.toString()}`;
}

export function ReportTabNav({
  clientSlug,
  range,
  start,
  end,
  primaryColor,
  activeSlug,
  platformTabs,
  showOverviewTab = true,
  navBasePath,
  navPreservedQuery,
}: Props) {
  const omitViewSlug = !showOverviewTab && platformTabs.length === 1 ? platformTabs[0].slug : null;

  const tabs: { slug: string; label: string }[] = [
    ...(showOverviewTab ? [{ slug: "overview", label: "Overview" as const }] : []),
    ...platformTabs,
  ];

  return (
    <nav className="mb-8 border-b border-zinc-200" aria-label="Report views">
      <div className="-mx-1 overflow-x-auto pb-px scrollbar-thin">
        <ul className="flex min-w-0 gap-0">
          {tabs.map((tab) => {
            const active = tab.slug === activeSlug;
            return (
              <li key={tab.slug} className="shrink-0">
                <Link
                  href={hrefForTab(
                    clientSlug,
                    range,
                    start,
                    end,
                    tab.slug,
                    omitViewSlug,
                    navBasePath,
                    navPreservedQuery,
                  )}
                  className={`block whitespace-nowrap px-4 py-3 text-sm transition ${
                    active
                      ? "border-b-2 font-semibold text-zinc-900"
                      : "border-b-2 border-transparent font-medium text-zinc-500 hover:text-zinc-700"
                  }`}
                  style={
                    active
                      ? {
                          borderBottomColor: primaryColor,
                        }
                      : undefined
                  }
                >
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
