"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AiPrompt = {
  id: string;
  name: string;
  platform: string;
  prompt_text: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export default function AiPromptsPage() {
  const [prompts, setPrompts] = useState<AiPrompt[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => prompts.find((p) => p.id === selectedId) ?? null,
    [prompts, selectedId],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai-prompts");
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to load prompts");
      }
      const data = (await res.json()) as AiPrompt[];
      setPrompts(data);
      if (data.length > 0) {
        setSelectedId((prev) => prev ?? data[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (selected && !editing) {
      setDraftText(selected.prompt_text);
    }
  }, [selected, editing]);

  const charCount = editing ? draftText.length : (selected?.prompt_text.length ?? 0);
  const estTokens = Math.ceil(charCount / 4);

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/ai-prompts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id, prompt_text: draftText }),
      });
      const body = (await res.json().catch(() => ({}))) as AiPrompt & {
        error?: string;
      };
      if (!res.ok) {
        throw new Error(body.error ?? "Save failed");
      }
      setPrompts((prev) => prev.map((p) => (p.id === body.id ? body : p)));
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI prompts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage prompt templates for weekly insights generation.
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(260px,340px)_1fr]">
        <div className="rounded-lg border border-border p-4">
          <h2 className="mb-3 text-sm font-semibold">Prompts</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : prompts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No prompts yet.</p>
          ) : (
            <ul className="space-y-1">
              {prompts.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(p.id);
                      setEditing(false);
                    }}
                    className={cn(
                      "w-full rounded-md px-3 py-2 text-left text-sm",
                      selectedId === p.id
                        ? "bg-muted font-medium"
                        : "hover:bg-muted/50",
                    )}
                  >
                    <span className="block">{p.name}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {p.platform}
                      {p.is_default ? (
                        <Badge variant="secondary">Default</Badge>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-border p-4">
          {!selected ? (
            <p className="text-sm text-muted-foreground">Select a prompt.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold">{selected.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    Platform: {selected.platform}
                  </p>
                </div>
                {!editing ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing(true)}
                  >
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditing(false);
                        setDraftText(selected.prompt_text);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={saving}
                      onClick={() => void handleSave()}
                    >
                      Save
                    </Button>
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                {charCount.toLocaleString()} characters · ~{estTokens.toLocaleString()}{" "}
                tokens (chars ÷ 4)
              </p>

              {editing ? (
                <textarea
                  className="min-h-[420px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                />
              ) : (
                <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-4 font-mono text-sm">
                  {selected.prompt_text}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
