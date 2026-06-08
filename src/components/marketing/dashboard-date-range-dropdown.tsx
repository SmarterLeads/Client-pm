"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";

import { useDashboardDateRange } from "@/contexts/dashboard-date-range-context";
import type { DashboardDateRangePreset } from "@/lib/queries/lead-gen-query-keys";

const PRESETS: Array<{ id: Exclude<DashboardDateRangePreset, "custom">; label: string }> = [
  { id: "last_7", label: "Last 7 Days" },
  { id: "last_14", label: "Last 14 Days" },
  { id: "last_30", label: "Last 30 Days" },
  { id: "mtd", label: "MTD" },
  { id: "last_month", label: "Last Month" },
  { id: "ytd", label: "Year to Date" },
];

const headerBtnClass =
  "inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50";

export function DashboardDateRangeDropdown() {
  const { preset, customStart, customEnd, setPreset, setCustomRange } = useDashboardDateRange();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [months, setMonths] = useState(2);
  const [showCustomPicker, setShowCustomPicker] = useState(preset === "custom");
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(() =>
    preset === "custom" && customStart && customEnd
      ? { from: parseIsoDate(customStart) ?? undefined, to: parseIsoDate(customEnd) ?? undefined }
      : undefined,
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    const setFromWindow = () => setMonths(window.innerWidth < 768 ? 1 : 2);
    setFromWindow();
    window.addEventListener("resize", setFromWindow);
    return () => window.removeEventListener("resize", setFromWindow);
  }, []);

  useEffect(() => {
    if (preset === "custom") setShowCustomPicker(true);
  }, [preset]);

  const buttonLabel = useMemo(
    () => getButtonLabel(preset, customStart, customEnd),
    [preset, customStart, customEnd],
  );

  const selectPreset = (id: Exclude<DashboardDateRangePreset, "custom">) => {
    setPreset(id);
    setShowCustomPicker(false);
    setOpen(false);
  };

  const openCustom = () => {
    setShowCustomPicker(true);
    setOpen(true);
    if (draftRange?.from && draftRange?.to) return;
    if (customStart && customEnd) {
      const from = parseIsoDate(customStart);
      const to = parseIsoDate(customEnd);
      if (from && to && from <= to) setDraftRange({ from, to });
    }
  };

  const applyCustom = () => {
    if (!draftRange?.from || !draftRange?.to) return;
    setCustomRange(toIsoDateUtc(draftRange.from), toIsoDateUtc(draftRange.to));
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={headerBtnClass}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="max-w-[9rem] truncate sm:max-w-[11rem]">{buttonLabel}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(92vw,640px)] rounded-xl border border-zinc-200 bg-white p-2 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
          <div className="space-y-0.5" role="listbox">
            {PRESETS.map((opt) => {
              const active = preset === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => selectPreset(opt.id)}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
                    active
                      ? "font-semibold text-zinc-900 dark:text-zinc-50"
                      : "text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  <span>{opt.label}</span>
                  {active ? <span className="text-zinc-500">✓</span> : null}
                </button>
              );
            })}
            <button
              type="button"
              role="option"
              aria-selected={preset === "custom"}
              onClick={openCustom}
              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
                preset === "custom"
                  ? "font-semibold text-zinc-900 dark:text-zinc-50"
                  : "text-zinc-700 dark:text-zinc-300"
              }`}
            >
              <span>Custom</span>
              {preset === "custom" ? <span className="text-zinc-500">✓</span> : null}
            </button>
          </div>

          {showCustomPicker ? (
            <div className="mt-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
              <DayPicker
                mode="range"
                numberOfMonths={months}
                selected={draftRange}
                onSelect={setDraftRange}
                defaultMonth={draftRange?.from}
                showOutsideDays
                className="text-sm"
              />
              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {draftRange?.from && draftRange?.to
                    ? `${formatShortDate(toIsoDateUtc(draftRange.from))} – ${formatShortDate(toIsoDateUtc(draftRange.to))}`
                    : "Select start and end dates"}
                </p>
                <button
                  type="button"
                  onClick={applyCustom}
                  disabled={!draftRange?.from || !draftRange?.to}
                  className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
                >
                  Apply
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function getButtonLabel(
  preset: DashboardDateRangePreset,
  customStart?: string,
  customEnd?: string,
): string {
  if (preset === "last_7") return "Last 7 Days";
  if (preset === "last_14") return "Last 14 Days";
  if (preset === "last_30") return "Last 30 Days";
  if (preset === "mtd") return "MTD";
  if (preset === "last_month") return "Last Month";
  if (preset === "ytd") return "Year to Date";
  if (preset === "custom" && customStart && customEnd) {
    return `${formatShortDate(customStart)} – ${formatShortDate(customEnd)}`;
  }
  return "Last 30 Days";
}

function parseIsoDate(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = new Date(`${iso}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toIsoDateUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatShortDate(iso: string): string {
  const d = parseIsoDate(iso);
  if (!d) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
