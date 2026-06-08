"use client";

import { useState } from "react";

import { Download, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";

type Props = {
  clientSlug: string;
  primaryColor: string;
};

export function DownloadPdfButton({ clientSlug, primaryColor }: Props) {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  const onDownload = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const q = new URLSearchParams(searchParams.toString());
      const url = `/api/report/${clientSlug}/download-pdf${q.toString() ? `?${q.toString()}` : ""}`;
      const res = await fetch(url, { method: "GET" });
      if (!res.ok) throw new Error(`Failed to generate PDF (${res.status})`);
      const blob = await res.blob();
      const fallbackName = `${clientSlug}-performance-report.pdf`;
      const contentDisposition = res.headers.get("content-disposition") ?? "";
      const match = contentDisposition.match(/filename\*?=(?:UTF-8''|")?([^\";]+)/i);
      const fileName = decodeURIComponent((match?.[1] ?? fallbackName).replace(/"/g, ""));
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      // Keep UX simple; console visibility is enough for internal dashboard use.
      console.error("[download-pdf] failed:", e);
      alert("Unable to generate PDF right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onDownload}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-md border bg-white px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-70"
      style={{ borderColor: primaryColor, color: primaryColor }}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {loading ? "Generating..." : "Download PDF"}
    </button>
  );
}
