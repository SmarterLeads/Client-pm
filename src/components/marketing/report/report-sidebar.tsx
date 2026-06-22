"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { AgencyLogo } from "@/components/marketing/report/agency-logo";

export type SidebarClient = {
  id: string;
  name: string;
  slug: string;
  status: "green" | "amber" | "red";
};

export type SidebarGroup = {
  agencyName: string;
  agencyPrimaryColor: string;
  clients: SidebarClient[];
};

type Props = {
  groups: SidebarGroup[];
  currentSlug: string;
  logoUrl: string | null;
  agencyName: string;
  primaryColor: string;
  /** Base path for client links (default `/marketing`). */
  linkBasePath?: string;
};

export function ReportSidebar({
  groups,
  currentSlug,
  logoUrl,
  agencyName,
  primaryColor,
  linkBasePath = "/marketing",
}: Props) {
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        clients: g.clients.filter((c) => c.name.toLowerCase().includes(q)),
      }))
      .filter((g) => g.clients.length > 0);
  }, [groups, query]);

  return (
    <>
      <button
        type="button"
        className="fixed left-4 top-4 z-40 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium shadow-sm md:hidden"
        onClick={() => setMobileOpen((o) => !o)}
      >
        {mobileOpen ? "Close" : "Clients"}
      </button>

      {mobileOpen ? (
        <div className="fixed inset-0 z-30 bg-black/20 md:hidden" onClick={() => setMobileOpen(false)} />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[240px] transform border-r border-zinc-200 bg-white transition-transform md:static md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4">
          <div className="mb-4">
            <AgencyLogo
              src={logoUrl}
              agencyName={agencyName}
              agencyPrimaryColor={primaryColor}
              placeholderClassName="h-8 w-32 rounded-md"
              imgClassName="h-8 w-auto max-w-full object-contain object-left"
            />
          </div>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clients..."
            className="mb-4 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
          />

          <div className="space-y-4">
            {filtered.map((group) => (
              <div key={group.agencyName}>
                {groups.length > 1 ? (
                  <div
                    className="mb-2 w-full rounded px-3 py-2 text-[12px] font-semibold uppercase tracking-wide text-white"
                    style={{ backgroundColor: group.agencyPrimaryColor }}
                  >
                    {group.agencyName}
                  </div>
                ) : null}
                <div className="space-y-1">
                  {group.clients.map((client) => {
                    const active = client.slug === currentSlug;
                    return (
                      <Link
                        key={client.id}
                        href={`${linkBasePath}/${client.slug}`}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center justify-between rounded-md px-2 py-2 text-sm ${
                          active ? "font-semibold text-zinc-900" : "text-zinc-700 hover:bg-zinc-50"
                        }`}
                        style={active ? { backgroundColor: `${primaryColor}20` } : undefined}
                      >
                        <span className="truncate pr-2">{client.name}</span>
                        <span
                          className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                            client.status === "green"
                              ? "bg-emerald-500"
                              : client.status === "amber"
                                ? "bg-amber-500"
                                : "bg-red-500"
                          }`}
                        />
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}
