"use client";

import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const NEW_PROMPT_TEMPLATE = `{{ACCOUNT_CONTEXT}}

{{GOOGLE_ADS_DATA}}

Write a concise weekly Google Ads insights report for the account manager.`;

function emptyForm(): PromptForm {
  return {
    name: "",
    platform: "google_ads",
    prompt_text: NEW_PROMPT_TEMPLATE,
    is_default: false,
  };
}

function formFromPrompt(p: AiPrompt): PromptForm {
  return {
    name: p.name,
    platform: p.platform,
    prompt_text: p.prompt_text,
    is_default: p.is_default,
  };
}

export default function AiPromptsPage() {
  const [prompts, setPrompts] = useState<AiPrompt[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"view" | "edit" | "create">("view");
  const [form, setForm] = useState<PromptForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => prompts.find((p) => p.id === selectedId) ?? null,
    [prompts, selectedId],
  );

  const isEditing = mode === "edit" || mode === "create";

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
      setSelectedId((prev) => {
        if (prev && data.some((p) => p.id === prev)) return prev;
        return data[0]?.id ?? null;
      });
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
    if (selected && mode === "view") {
      setForm(formFromPrompt(selected));
    }
  }, [selected, mode]);

  const charCount = isEditing
    ? form.prompt_text.length
    : (selected?.prompt_text.length ?? 0);
  const estTokens = Math.ceil(charCount / 4);

  function startCreate() {
    setSelectedId(null);
    setForm(emptyForm());
    setMode("create");
    setError(null);
  }

  function startEdit() {
    if (!selected) return;
    setForm(formFromPrompt(selected));
    setMode("edit");
    setError(null);
  }

  function cancelEdit() {
    if (mode === "create") {
      setMode("view");
      setSelectedId((prev) => prev ?? prompts[0]?.id ?? null);
      if (prompts[0]) setForm(formFromPrompt(prompts[0]));
      return;
    }
    if (selected) setForm(formFromPrompt(selected));
    setMode("view");
  }

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
        const res = await fetch("/api/ai-prompts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            platform,
            prompt_text,
            is_default: form.is_default,
          }),
        });
        const body = (await res.json().catch(() => ({}))) as AiPrompt & {
          error?: string;
        };
        if (!res.ok) {
          throw new Error(body.error ?? "Create failed");
        }
        setPrompts((prev) => [body, ...prev]);
        setSelectedId(body.id);
        setForm(formFromPrompt(body));
        setMode("view");
        return;
      }

      if (!selected) return;

      const res = await fetch("/api/ai-prompts", {
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
      const body = (await res.json().catch(() => ({}))) as AiPrompt & {
        error?: string;
      };
      if (!res.ok) {
        throw new Error(body.error ?? "Save failed");
      }
      setPrompts((prev) =>
        prev.map((p) => {
          if (p.id === body.id) return body;
          if (body.is_default && p.platform === body.platform) {
            return { ...p, is_default: false };
          }
          return p;
        }),
      );
      setForm(formFromPrompt(body));
      setMode("view");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selected || mode === "create") return;
    if (!confirm(`Delete prompt "${selected.name}"?`)) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/ai-prompts?id=${encodeURIComponent(selected.id)}`,
        { method: "DELETE" },
      );
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(body.error ?? "Delete failed");
      }
      const next = prompts.filter((p) => p.id !== selected.id);
      setPrompts(next);
      setSelectedId(next[0]?.id ?? null);
      setMode("view");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI prompts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create and edit prompt templates for weekly insights generation. Use{" "}
          <code className="rounded bg-muted px-1 py-0.5">
            {"{{ACCOUNT_CONTEXT}}"}
          </code>{" "}
          and{" "}
          <code className="rounded bg-muted px-1 py-0.5">
            {"{{GOOGLE_ADS_DATA}}"}
          </code>{" "}
          where data should be injected.
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(260px,340px)_1fr]">
        <div className="rounded-lg border border-border p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Prompts</h2>
            <Button type="button" size="sm" onClick={startCreate}>
              <Plus className="mr-1 size-4" />
              New
            </Button>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : prompts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No prompts yet. Click New to create one.
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
                      setForm(formFromPrompt(p));
                    }}
                    className={cn(
                      "w-full rounded-md px-3 py-2 text-left text-sm",
                      selectedId === p.id && mode !== "create"
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
          {mode === "create" ? (
            <PromptEditorForm
              title="New prompt"
              form={form}
              setForm={setForm}
              isEditing
              charCount={charCount}
              estTokens={estTokens}
              saving={saving}
              onCancel={cancelEdit}
              onSave={() => void handleSave()}
            />
          ) : !selected ? (
            <p className="text-sm text-muted-foreground">
              Select a prompt or create a new one.
            </p>
          ) : isEditing ? (
            <PromptEditorForm
              title={selected.name}
              form={form}
              setForm={setForm}
              isEditing
              charCount={charCount}
              estTokens={estTokens}
              saving={saving}
              onCancel={cancelEdit}
              onSave={() => void handleSave()}
            />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold">{selected.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    Platform: {selected.platform}
                    {selected.is_default ? (
                      <Badge variant="secondary" className="ml-2">
                        Default
                      </Badge>
                    ) : null}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleDelete()}
                    disabled={saving}
                  >
                    Delete
                  </Button>
                  <Button type="button" size="sm" onClick={startEdit}>
                    Edit
                  </Button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                {charCount.toLocaleString()} characters · ~
                {estTokens.toLocaleString()} tokens (chars ÷ 4)
              </p>

              <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-4 font-mono text-sm">
                {selected.prompt_text}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PromptEditorForm({
  title,
  form,
  setForm,
  charCount,
  estTokens,
  saving,
  onCancel,
  onSave,
}: {
  title: string;
  form: PromptForm;
  setForm: React.Dispatch<React.SetStateAction<PromptForm>>;
  isEditing: boolean;
  charCount: number;
  estTokens: number;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="flex gap-2">
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
          <Label htmlFor="prompt-name">Name</Label>
          <Input
            id="prompt-name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Google Ads weekly insights"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="prompt-platform">Platform</Label>
          <Input
            id="prompt-platform"
            list="prompt-platform-suggestions"
            value={form.platform}
            onChange={(e) =>
              setForm((f) => ({ ...f, platform: e.target.value }))
            }
            placeholder="google_ads"
          />
          <datalist id="prompt-platform-suggestions">
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
        Set as default for this platform
      </label>

      <p className="text-xs text-muted-foreground">
        {charCount.toLocaleString()} characters · ~{estTokens.toLocaleString()}{" "}
        tokens (chars ÷ 4)
      </p>

      <div className="space-y-2">
        <Label htmlFor="prompt-text">Prompt text</Label>
        <textarea
          id="prompt-text"
          className="min-h-[420px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
          value={form.prompt_text}
          onChange={(e) =>
            setForm((f) => ({ ...f, prompt_text: e.target.value }))
          }
        />
      </div>
    </div>
  );
}
