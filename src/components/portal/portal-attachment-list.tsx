"use client";

import { useState } from "react";
import { getAttachmentSignedUrl } from "@/lib/actions/attachments";
import { formatFileSize } from "@/lib/attachments/display";
import type { AttachmentListItem } from "@/lib/attachments/types";
import { Button } from "@/components/ui/button";
import { DownloadIcon } from "lucide-react";

type PortalAttachmentListProps = {
  attachments: AttachmentListItem[];
};

export function PortalAttachmentList({ attachments }: PortalAttachmentListProps) {
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleDownload(attachment: AttachmentListItem) {
    setError(null);
    setPendingId(attachment.id);

    try {
      const url = await getAttachmentSignedUrl(attachment.id);
      const link = document.createElement("a");
      link.href = url;
      link.download = attachment.filename;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to download file.",
      );
    } finally {
      setPendingId(null);
    }
  }

  if (attachments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No files available.</p>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <ul className="divide-y divide-border rounded-lg border border-border">
        {attachments.map((attachment) => (
          <li
            key={attachment.id}
            className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{attachment.filename}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(attachment.file_size_bytes)}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pendingId === attachment.id}
              onClick={() => void handleDownload(attachment)}
            >
              <DownloadIcon className="size-4" aria-hidden />
              Download
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
