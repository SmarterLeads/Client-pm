"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  type DashboardComparisonMode,
  type DashboardDateRangePreset,
  type DashboardDateRangeState,
  dashboardRangeQueryKey,
} from "@/lib/queries/lead-gen-query-keys";

const STORAGE_KEY = "dashboard-date-settings";

type StoredSettings = {
  preset: DashboardDateRangePreset;
  customStart?: string;
  customEnd?: string;
  comparison: DashboardComparisonMode;
};

type ContextValue = DashboardDateRangeState & {
  rangeQueryKey: ReturnType<typeof dashboardRangeQueryKey>;
  setPreset: (preset: DashboardDateRangePreset) => void;
  setCustomRange: (start: string, end: string) => void;
  setComparison: (comparison: DashboardComparisonMode) => void;
};

const DashboardDateRangeContext = createContext<ContextValue | null>(null);

const DEFAULT_STATE: DashboardDateRangeState = {
  preset: "last_30",
  comparison: "prior_period",
};

function isValidPreset(value: unknown): value is DashboardDateRangePreset {
  return (
    value === "last_7" ||
    value === "last_14" ||
    value === "last_30" ||
    value === "mtd" ||
    value === "last_month" ||
    value === "ytd" ||
    value === "custom"
  );
}

function isValidComparison(value: unknown): value is DashboardComparisonMode {
  return value === "prior_period" || value === "prior_year";
}

function readStoredSettings(): DashboardDateRangeState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as StoredSettings;
    if (!isValidPreset(parsed.preset) || !isValidComparison(parsed.comparison)) {
      return DEFAULT_STATE;
    }
    return {
      preset: parsed.preset,
      customStart: parsed.customStart,
      customEnd: parsed.customEnd,
      comparison: parsed.comparison,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function writeStoredSettings(state: DashboardDateRangeState) {
  if (typeof window === "undefined") return;
  const payload: StoredSettings = {
    preset: state.preset,
    customStart: state.customStart,
    customEnd: state.customEnd,
    comparison: state.comparison,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function DashboardDateRangeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DashboardDateRangeState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(readStoredSettings());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeStoredSettings(state);
  }, [state, hydrated]);

  const setPreset = useCallback((preset: DashboardDateRangePreset) => {
    setState((prev) => ({
      ...prev,
      preset,
      ...(preset !== "custom" ? { customStart: undefined, customEnd: undefined } : {}),
    }));
  }, []);

  const setCustomRange = useCallback((start: string, end: string) => {
    setState((prev) => ({
      ...prev,
      preset: "custom",
      customStart: start,
      customEnd: end,
    }));
  }, []);

  const setComparison = useCallback((comparison: DashboardComparisonMode) => {
    setState((prev) => ({ ...prev, comparison }));
  }, []);

  const rangeQueryKey = useMemo(() => dashboardRangeQueryKey(state), [state]);

  const value = useMemo(
    (): ContextValue => ({
      ...state,
      rangeQueryKey,
      setPreset,
      setCustomRange,
      setComparison,
    }),
    [state, rangeQueryKey, setPreset, setCustomRange, setComparison],
  );

  return (
    <DashboardDateRangeContext.Provider value={value}>
      {children}
    </DashboardDateRangeContext.Provider>
  );
}

export function useDashboardDateRange() {
  const ctx = useContext(DashboardDateRangeContext);
  if (!ctx) {
    throw new Error("useDashboardDateRange must be used within DashboardDateRangeProvider");
  }
  return ctx;
}
