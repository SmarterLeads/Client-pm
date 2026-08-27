import type { KbArticleVersionRow } from "@/lib/knowledge-base/types";

type KbVersionHistoryProps = {
  versions: KbArticleVersionRow[];
};

export function KbVersionHistory({ versions }: KbVersionHistoryProps) {
  if (versions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No saved versions yet.</p>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {versions.map((version) => (
        <li key={version.id} className="px-4 py-3 text-sm">
          <p className="font-medium">{version.title}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(version.created_at).toLocaleString()}
            {version.changed_by_name ? ` · ${version.changed_by_name}` : ""}
          </p>
        </li>
      ))}
    </ul>
  );
}
