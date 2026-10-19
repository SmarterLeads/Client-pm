"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type InsightListItem = {
  id: string;
  client_id: string;
  prompt_id: string | null;
  week_start: string;
  week_end: string;
  status: "generating" | "completed" | "failed" | string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

type InsightDetail = InsightListItem & {
  report_markdown: string | null;
};

type AIWeeklyInsightsTabProps = {
  clientId: string;
  clientName: string;
  googleAdsCustomerId?: string;
};

function statusBadgeVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "completed") return "default";
  if (status === "failed") return "destructive";
  if (status === "generating") return "secondary";
  return "outline";
}

export function AIWeeklyInsightsTab({
  clientId,
  clientName,
  googleAdsCustomerId,
}: AIWeeklyInsightsTabProps) {
  const [reports, setReports] = useState<InsightListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<InsightDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    const res = await fetch(`/api/ai-weekly-insights/${clientId}`);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? "Failed to load reports");
    }
    const data = (await res.json()) as InsightListItem[];
    setReports(data);
    return data;
  }, [clientId]);

  const fetchDetail = useCallback(
    async (id: string) => {
      setLoadingDetail(true);
      try {
        const res = await fetch(
          `/api/ai-weekly-insights/${clientId}?id=${encodeURIComponent(id)}`,
        );
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(body.error ?? "Failed to load report");
        }
        const data = (await res.json()) as InsightDetail;
        setDetail(data);
      } finally {
        setLoadingDetail(false);
      }
    },
    [clientId],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingList(true);
      setError(null);
      try {
        const data = await fetchList();
        if (!cancelled && data.length > 0) {
          setSelectedId((prev) => prev ?? data[0].id);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load reports");
        }
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchList]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    void fetchDetail(selectedId);
  }, [selectedId, fetchDetail]);

  const hasGenerating = useMemo(
    () => reports.some((r) => r.status === "generating"),
    [reports],
  );

  useEffect(() => {
    if (!hasGenerating) return;
    const timer = setInterval(() => {
      void (async () => {
        try {
          const data = await fetchList();
          if (selectedId) {
            const row = data.find((r) => r.id === selectedId);
            if (row && row.status !== "generating") {
              await fetchDetail(selectedId);
            }
          }
        } catch {
          /* ignore poll errors */
        }
      })();
    }, 5000);
    return () => clearInterval(timer);
  }, [hasGenerating, fetchList, fetchDetail, selectedId]);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/ai-weekly-insights/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId }),
      });
      const body = (await res.json().catch(() => ({}))) as InsightListItem & {
        error?: string;
      };
      if (!res.ok) {
        throw new Error(body.error ?? "Failed to start generation");
      }
      setSelectedId(body.id);
      const list = await fetchList();
      if (!list.some((r) => r.id === body.id)) {
        setReports((prev) => [body, ...prev]);
      }
      await fetchDetail(body.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate");
    } finally {
      setGenerating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this report?")) return;
    const res = await fetch(
      `/api/ai-weekly-insights/${clientId}?id=${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Failed to delete");
      return;
    }
    const next = reports.filter((r) => r.id !== id);
    setReports(next);
    if (selectedId === id) {
      setSelectedId(next[0]?.id ?? null);
      setDetail(null);
    }
  }

  function downloadMarkdown() {
    if (!detail?.report_markdown) return;
    const blob = new Blob([detail.report_markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${clientName.replace(/\s+/g, "-")}-weekly-insights-${detail.week_start}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(240px,320px)_1fr]">
      <div className="space-y-3 rounded-lg border border-border p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Weekly reports</h3>
          <Button
            size="sm"
            onClick={() => void handleGenerate()}
            disabled={generating}
          >
            {generating ? (
              <Loader2 className="mr-1 size-4 animate-spin" />
            ) : null}
            + Generate
          </Button>
        </div>
        {!googleAdsCustomerId ? (
          <p className="text-xs text-muted-foreground">
            No Google Ads customer ID on this client; data is matched by client
            record in performance tables.
          </p>
        ) : null}
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}
        {loadingList ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reports yet.</p>
        ) : (
          <ul className="space-y-1">
            {reports.map((r) => (
              <li key={r.id}>
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-2 py-2 text-sm",
                    selectedId === r.id
                      ? "border-primary bg-muted/50"
                      : "border-transparent hover:bg-muted/40",
                  )}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setSelectedId(r.id)}
                  >
                    <span className="block truncate font-medium">
                      {r.week_start} – {r.week_end}
                    </span>
                    <Badge
                      variant={statusBadgeVariant(r.status)}
                      className="mt-1"
                    >
                      {r.status}
                    </Badge>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => void handleDelete(r.id)}
                    aria-label="Delete report"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="min-h-[320px] rounded-lg border border-border p-6">
        {!selectedId ? (
          <p className="text-sm text-muted-foreground">
            Select or generate a report to view insights.
          </p>
        ) : loadingDetail && !detail ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : detail?.status === "generating" ? (
          <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <Loader2 className="size-8 animate-spin" />
            <p className="text-sm">Generating report…</p>
          </div>
        ) : detail?.status === "failed" ? (
          <div className="space-y-2">
            <p className="font-medium text-destructive">Generation failed</p>
            <p className="text-sm text-muted-foreground">
              {detail.error_message ?? "Unknown error"}
            </p>
          </div>
        ) : detail?.report_markdown ? (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={downloadMarkdown}>
                Download .md
              </Button>
            </div>
            <article className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{detail.report_markdown}</ReactMarkdown>
            </article>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No report content.</p>
        )}
      </div>
    </div>
  );
}
