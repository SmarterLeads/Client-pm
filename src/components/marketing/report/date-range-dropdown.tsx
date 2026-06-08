"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DayPicker, type DateRange } from "react-day-picker";

type PresetId = "last_7" | "last_30" | "mtd" | "last_month";

type Props = {
  primaryColor: string;
  initialRange: string;
  initialStart?: string;
  initialEnd?: string;
};

const PRESETS: Array<{ id: PresetId; label: string }> = [
  { id: "last_7", label: "Last 7 Days" },
  { id: "last_30", label: "Last 30 Days" },
  { id: "mtd", label: "MTD" },
  { id: "last_month", label: "Last Month" },
];

export function DateRangeDropdown({ primaryColor, initialRange, initialStart, initialEnd }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [months, setMonths] = useState(2);
  const [showCustomPicker, setShowCustomPicker] = useState(initialRange === "custom");
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(() => {
    if (initialRange !== "custom" || !initialStart || !initialEnd) return undefined;
    const from = parseIsoDate(initialStart);
    const to = parseIsoDate(initialEnd);
    if (!from || !to || from > to) return undefined;
    return { from, to };
  });

  useEffect(() => {
    const onPointerDown = (evt: MouseEvent) => {
      if (!rootRef.current?.contains(evt.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    const setFromWindow = () => setMonths(window.innerWidth < 768 ? 1 : 2);
    setFromWindow();
    window.addEventListener("resize", setFromWindow);
    return () => window.removeEventListener("resize", setFromWindow);
  }, []);

  const currentParams = useMemo(
    () => new URLSearchParams(searchParams.toString()),
    [searchParams],
  );
  const selectedRange = (searchParams.get("range") ?? initialRange ?? "last_30").toLowerCase();
  const selectedStart = searchParams.get("start") ?? initialStart;
  const selectedEnd = searchParams.get("end") ?? initialEnd;
  const buttonLabel = getButtonLabel(selectedRange, selectedStart, selectedEnd);
  const selectedPreset = PRESETS.find((p) => p.id === selectedRange);
  const customActive = selectedRange === "custom";

  useEffect(() => {
    if (customActive) setShowCustomPicker(true);
  }, [customActive]);

  const goWithParams = (params: URLSearchParams) => {
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
    setOpen(false);
  };

  const selectPreset = (id: PresetId) => {
    const next = new URLSearchParams(currentParams.toString());
    next.set("range", id);
    next.delete("start");
    next.delete("end");
    setShowCustomPicker(false);
    goWithParams(next);
  };

  const openCustom = () => {
    setShowCustomPicker(true);
    setOpen(true);
    if (draftRange?.from && draftRange?.to) return;
    if (selectedStart && selectedEnd) {
      const from = parseIsoDate(selectedStart);
      const to = parseIsoDate(selectedEnd);
      if (from && to && from <= to) {
        setDraftRange({ from, to });
      }
    }
  };

  const applyCustom = () => {
    if (!draftRange?.from || !draftRange?.to) return;
    const next = new URLSearchParams(currentParams.toString());
    next.set("range", "custom");
    next.set("start", toIsoDateUtc(draftRange.from));
    next.set("end", toIsoDateUtc(draftRange.to));
    goWithParams(next);
  };

  const ringColor = withAlpha(primaryColor, 0.22);
  const middleBg = withAlpha(primaryColor, 0.16);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="min-w-[170px] rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
      >
        {buttonLabel} ▾
      </button>

      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-[min(92vw,640px)] rounded-xl border border-zinc-200 bg-white p-2 shadow-xl">
          <div className="space-y-1">
            {PRESETS.map((opt) => {
              const active = selectedPreset?.id === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => selectPreset(opt.id)}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-50"
                  style={active ? { fontWeight: 700 } : undefined}
                >
                  <span>{opt.label}</span>
                  <span style={{ color: active ? primaryColor : "transparent" }}>✓</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={openCustom}
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-50"
              style={customActive ? { fontWeight: 700 } : undefined}
            >
              <span>Custom</span>
              <span style={{ color: customActive ? primaryColor : "transparent" }}>✓</span>
            </button>
          </div>

          {showCustomPicker ? (
            <div className="mt-3 rounded-lg border border-zinc-200 p-3">
              <DayPicker
                mode="range"
                numberOfMonths={months}
                selected={draftRange}
                onSelect={setDraftRange}
                defaultMonth={draftRange?.from}
                showOutsideDays
                className="text-sm"
                styles={{
                  caption_label: { fontWeight: 600, color: "#27272A" },
                  day: { borderRadius: 8 },
                  day_button: { borderRadius: 8 },
                }}
                modifiersStyles={{
                  selected: { backgroundColor: primaryColor, color: "#fff" },
                  range_start: { backgroundColor: primaryColor, color: "#fff" },
                  range_end: { backgroundColor: primaryColor, color: "#fff" },
                  range_middle: { backgroundColor: middleBg, color: "#111827" },
                  today: { outline: `2px solid ${ringColor}`, outlineOffset: "1px" },
                }}
              />
              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="text-xs text-zinc-500">
                  {draftRange?.from && draftRange?.to
                    ? `${formatShortDate(toIsoDateUtc(draftRange.from))} – ${formatShortDate(toIsoDateUtc(draftRange.to))}`
                    : "Select start and end dates"}
                </p>
                <button
                  type="button"
                  onClick={applyCustom}
                  disabled={!draftRange?.from || !draftRange?.to}
                  className="rounded-md px-3 py-1.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ backgroundColor: primaryColor }}
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

function getButtonLabel(range: string, start?: string, end?: string): string {
  const r = range.trim().toLowerCase();
  if (r === "last_7") return "Last 7 Days";
  if (r === "mtd") return "MTD";
  if (r === "last_month") return "Last Month";
  if (r === "custom" && start && end) {
    return `${formatShortDate(start)} – ${formatShortDate(end)}`;
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

function withAlpha(hexColor: string, alpha: number): string {
  const hex = hexColor.replace("#", "").trim();
  const clean = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return `rgba(37, 99, 235, ${alpha})`;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
