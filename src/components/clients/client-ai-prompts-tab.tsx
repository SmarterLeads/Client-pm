"use client";

import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ClientPlatformConnection } from "@/lib/queries/clients";
import { cn } from "@/lib/utils";

type ClientAiPrompt = {
  id: string;
  client_id: string;
  name: string;
  platform: string;
  prompt_text: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

type PromptForm = {
  name: string;
  platform: string;
  prompt_text: string;
  is_default: boolean;
};

const PLATFORM_SUGGESTIONS = [
  "google_ads",
  "meta",
  "linkedin",
  "tiktok",
] as const;

const DEFAULT_CLIENT_PROMPT = `Where to find data for this client:
- Google Ads daily metrics: synced to PM tables (campaign_daily_performance, search_term_performance, conversion_events) for this client's client_id.
- Use the Google Ads customer ID from platform connections when referencing the ad account externally.

Business context:
- Target CPA / ROAS:
- Qualified conversion event names:
- Brand terms to protect:
- Service areas:
- Notes on sales cycle / conversion lag:`;

function emptyForm(): PromptForm {
  return {
    name: "Google Ads weekly insights",
    platform: "google_ads",
    prompt_text: DEFAULT_CLIENT_PROMPT,
    is_default: true,
  };
}

function formFromPrompt(p: ClientAiPrompt): PromptForm {
  return {
    name: p.name,
    platform: p.platform,
    prompt_text: p.prompt_text,
    is_default: p.is_default,
  };
}

type ClientAiPromptsTabProps = {
  clientId: string;
  clientName: string;
  platformConnections: ClientPlatformConnection[];
};

export function ClientAiPromptsTab({
  clientId,
  clientName,
  platformConnections,
}: ClientAiPromptsTabProps) {
  const [prompts, setPrompts] = useState<ClientAiPrompt[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"view" | "edit" | "create">("view");
  const [form, setForm] = useState<PromptForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiBase = `/api/clients/${clientId}/ai-prompts`;

  const selected = useMemo(
    () => prompts.find((p) => p.id === selectedId) ?? null,
    [prompts, selectedId],
  );

  const isEditing = mode === "edit" || mode === "create";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiBase);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to load prompts");
      }
      const data = (await res.json()) as ClientAiPrompt[];
      setPrompts(data);
      setSelectedId((prev) => {
        if (prev && data.some((p) => p.id === prev)) return prev;
        return data[0]?.id ?? null;
      });
      if (data.length === 0) {
        setMode("create");
        setForm(emptyForm());
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (selected && mode === "view") {
      setForm(formFromPrompt(selected));
    }
  }, [selected, mode]);

  const charCount = isEditing
    ? form.prompt_text.length
    : (selected?.prompt_text.length ?? 0);
  const estTokens = Math.ceil(charCount / 4);

  async function handleSave() {
    const name = form.name.trim();
    const platform = form.platform.trim();
    const prompt_text = form.prompt_text;

    if (!name || !platform || !prompt_text.trim()) {
      setError("Name, platform, and prompt text are required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (mode === "create") {
        const res = await fetch(apiBase, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            platform,
            prompt_text,
            is_default: form.is_default,
          }),
        });
        const body = (await res.json().catch(() => ({}))) as ClientAiPrompt & {
          error?: string;
        };
        if (!res.ok) throw new Error(body.error ?? "Create failed");
        setPrompts((prev) => [body, ...prev]);
        setSelectedId(body.id);
        setMode("view");
        return;
      }

      if (!selected) return;

      const res = await fetch(apiBase, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selected.id,
          name,
          platform,
          prompt_text,
          is_default: form.is_default,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as ClientAiPrompt & {
        error?: string;
      };
      if (!res.ok) throw new Error(body.error ?? "Save failed");
      setPrompts((prev) =>
        prev.map((p) => {
          if (p.id === body.id) return body;
          if (body.is_default && p.platform === body.platform) {
            return { ...p, is_default: false };
          }
          return p;
        }),
      );
      setMode("view");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    if (!confirm(`Delete "${selected.name}"?`)) return;
    setSaving(true);
    try {
      const res = await fetch(`${apiBase}?id=${encodeURIComponent(selected.id)}`, {
        method: "DELETE",
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Delete failed");
      const next = prompts.filter((p) => p.id !== selected.id);
      setPrompts(next);
      setSelectedId(next[0]?.id ?? null);
      setMode(next.length ? "view" : "create");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">AI prompts</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Instructions for Claude specific to{" "}
          <span className="font-medium text-foreground">{clientName}</span>.
          Merged into weekly AI Insights using{" "}
          <code className="rounded bg-muted px-1 py-0.5">
            {"{{CLIENT_AI_INSTRUCTIONS}}"}
          </code>{" "}
          in the global template (Settings → AI Prompts).
        </p>
      </div>

      {platformConnections.length > 0 ? (
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
          <p className="font-medium">Linked platforms</p>
          <ul className="mt-2 list-inside list-disc text-muted-foreground">
            {platformConnections.map((c) => (
              <li key={`${c.platform}-${c.external_account_id ?? "none"}`}>
                {c.platform}
                {c.external_account_id
                  ? ` — ${c.external_account_id}`
                  : " — no external account ID"}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(240px,300px)_1fr]">
        <div className="rounded-lg border border-border p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Saved prompts</h3>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setMode("create");
                setForm(emptyForm());
                setSelectedId(null);
              }}
            >
              <Plus className="mr-1 size-4" />
              New
            </Button>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : prompts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No prompts yet — use the form to create one.
            </p>
          ) : (
            <ul className="space-y-1">
              {prompts.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(p.id);
                      setMode("view");
                    }}
                    className={cn(
                      "w-full rounded-md px-3 py-2 text-left text-sm",
                      selectedId === p.id && mode !== "create"
                        ? "bg-muted font-medium"
                        : "hover:bg-muted/50",
                    )}
                  >
                    <span className="block">{p.name}</span>
                    <span className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
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
          {mode === "create" || (isEditing && selected) ? (
            <ClientPromptEditor
              title={mode === "create" ? "New client prompt" : selected!.name}
              form={form}
              setForm={setForm}
              charCount={charCount}
              estTokens={estTokens}
              saving={saving}
              onCancel={() => {
                if (prompts.length === 0) {
                  setForm(emptyForm());
                  return;
                }
                setMode("view");
                if (selected) setForm(formFromPrompt(selected));
              }}
              onSave={() => void handleSave()}
              onDelete={
                mode !== "create" && selected
                  ? () => void handleDelete()
                  : undefined
              }
            />
          ) : !selected ? (
            <p className="text-sm text-muted-foreground">Select a prompt.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold">{selected.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selected.platform}
                    {selected.is_default ? (
                      <Badge variant="secondary" className="ml-2">
                        Default
                      </Badge>
                    ) : null}
                  </p>
                </div>
                <Button type="button" size="sm" onClick={() => setMode("edit")}>
                  Edit
                </Button>
              </div>
              <pre className="max-h-[480px] overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-4 font-mono text-sm">
                {selected.prompt_text}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ClientPromptEditor({
  title,
  form,
  setForm,
  charCount,
  estTokens,
  saving,
  onCancel,
  onSave,
  onDelete,
}: {
  title: string;
  form: PromptForm;
  setForm: React.Dispatch<React.SetStateAction<PromptForm>>;
  charCount: number;
  estTokens: number;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold">{title}</h3>
        <div className="flex gap-2">
          {onDelete ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={onDelete}
            >
              Delete
            </Button>
          ) : null}
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" size="sm" disabled={saving} onClick={onSave}>
            Save
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="client-prompt-name">Name</Label>
          <Input
            id="client-prompt-name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="client-prompt-platform">Platform</Label>
          <Input
            id="client-prompt-platform"
            list="client-prompt-platforms"
            value={form.platform}
            onChange={(e) =>
              setForm((f) => ({ ...f, platform: e.target.value }))
            }
          />
          <datalist id="client-prompt-platforms">
            {PLATFORM_SUGGESTIONS.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-4 rounded border-input"
          checked={form.is_default}
          onChange={(e) =>
            setForm((f) => ({ ...f, is_default: e.target.checked }))
          }
        />
        Default for this client and platform (used when generating AI Insights)
      </label>

      <p className="text-xs text-muted-foreground">
        {charCount.toLocaleString()} characters · ~{estTokens.toLocaleString()}{" "}
        tokens
      </p>

      <textarea
        className="min-h-[360px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
        value={form.prompt_text}
        onChange={(e) =>
          setForm((f) => ({ ...f, prompt_text: e.target.value }))
        }
      />
    </div>
  );
}
