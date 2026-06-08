"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, useTransition } from "react";
import { formatFileSize } from "@/lib/attachments/display";
import type {
  AttachmentEntityType,
  AttachmentListItem,
} from "@/lib/attachments/types";
import {
  deleteAttachment,
  getAttachmentSignedUrl,
  uploadAttachment,
} from "@/lib/actions/attachments";
import { toastError, toastSuccess } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DownloadIcon, Trash2Icon, UploadCloudIcon } from "lucide-react";

type FileUploadZoneProps = {
  entityType: AttachmentEntityType;
  entityId: string;
  attachments: AttachmentListItem[];
  canDelete?: boolean;
};

type UploadingFile = {
  name: string;
  progress: number;
};

export function FileUploadZone({
  entityType,
  entityId,
  attachments,
  canDelete = true,
}: FileUploadZoneProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState<UploadingFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (list.length === 0) return;

      setError(null);

      for (const file of list) {
        setUploading((current) => [
          ...current,
          { name: file.name, progress: 10 },
        ]);

        const formData = new FormData();
        formData.set("file", file);

        const result = await uploadAttachment(entityType, entityId, formData);

        setUploading((current) =>
          current.filter((item) => item.name !== file.name),
        );

        if (result.error) {
          setError(result.error);
          toastError(result.error);
          return;
        }

        toastSuccess("File uploaded");
      }

      startTransition(() => router.refresh());
    },
    [entityId, entityType, router],
  );

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    void handleFiles(e.dataTransfer.files);
  }

  async function handleDownload(attachment: AttachmentListItem) {
    setError(null);
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
    }
  }

  async function handleDelete(attachment: AttachmentListItem) {
    const confirmed = window.confirm(
      `Delete "${attachment.filename}"? This cannot be undone.`,
    );
    if (!confirmed) return;

    setPendingId(attachment.id);
    setError(null);

    const result = await deleteAttachment(attachment.id);
    setPendingId(null);

    if (result.error) {
      setError(result.error);
      toastError(result.error);
      return;
    }

    toastSuccess("File deleted");

    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-6 py-10 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/30",
        )}
      >
        <UploadCloudIcon className="size-8 text-muted-foreground" aria-hidden />
        <p className="mt-3 text-sm font-medium">
          Drop files here or click to browse
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Max file size 50 MB</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) {
              void handleFiles(e.target.files);
              e.target.value = "";
            }
          }}
        />
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {uploading.length > 0 ? (
        <ul className="space-y-2">
          {uploading.map((file) => (
            <li
              key={file.name}
              className="rounded-lg border border-border bg-muted/30 px-4 py-3"
            >
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate font-medium">{file.name}</span>
                <span className="text-xs text-muted-foreground">Uploading…</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-primary" />
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {attachments.length === 0 && uploading.length === 0 ? (
        <p className="text-sm text-muted-foreground">No files uploaded yet.</p>
      ) : null}

      {attachments.length > 0 ? (
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
                  {attachment.uploaded_by_name
                    ? ` · ${attachment.uploaded_by_name}`
                    : ""}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void handleDownload(attachment)}
                >
                  <DownloadIcon className="size-4" aria-hidden />
                  Download
                </Button>
                {canDelete ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pendingId === attachment.id}
                    onClick={() => void handleDelete(attachment)}
                  >
                    <Trash2Icon className="size-4" aria-hidden />
                    Delete
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
