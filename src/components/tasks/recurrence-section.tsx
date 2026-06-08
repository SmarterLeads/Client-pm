"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { updateTaskRecurrence } from "@/lib/actions/tasks";
import { toastError, toastSuccess } from "@/lib/toast";
import type { Task } from "@/lib/types";
import {
  WEEKDAY_OPTIONS,
  calculateNextOccurrence,
  defaultRecurrenceRule,
  formatNextOccurrence,
  parseRecurrenceRule,
  type RecurrenceFrequency,
  type RecurrenceRule,
} from "@/lib/tasks/recurrence";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const FREQUENCIES: { value: RecurrenceFrequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "custom", label: "Custom" },
];

type RecurrenceSectionProps = {
  task: Task;
  projectId: string;
  onUpdated: () => void;
};

export function RecurrenceSection({
  task,
  projectId,
  onUpdated,
}: RecurrenceSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isRecurring, setIsRecurring] = useState(task.is_recurring);
  const [rule, setRule] = useState<RecurrenceRule>(
    () => parseRecurrenceRule(task.recurrence_rule) ?? defaultRecurrenceRule(),
  );
  const skipSaveRef = useRef(true);

  useEffect(() => {
    setIsRecurring(task.is_recurring);
    setRule(
      parseRecurrenceRule(task.recurrence_rule) ?? defaultRecurrenceRule(),
    );
    skipSaveRef.current = true;
  }, [task.id, task.is_recurring, task.recurrence_rule]);

  const nextOccurrence = useMemo(() => {
    if (!isRecurring) return null;
    if (rule.frequency === "custom") return null;
    const ref = task.due_date ? new Date(task.due_date) : new Date();
    return calculateNextOccurrence(rule, ref);
  }, [isRecurring, rule, task.due_date]);

  useEffect(() => {
    if (skipSaveRef.current) {
      skipSaveRef.current = false;
      return;
    }
    if (!isRecurring) return;

    const timer = window.setTimeout(() => {
      persist(isRecurring, rule);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [isRecurring, rule]);

  function persist(recurring: boolean, nextRule: RecurrenceRule | null) {
    startTransition(async () => {
      const result = await updateTaskRecurrence(
        task.id,
        projectId,
        recurring,
        recurring ? nextRule : null,
      );
      if (result.error) {
        toastError(result.error);
        return;
      }
      toastSuccess("Recurrence updated");
      onUpdated();
      router.refresh();
    });
  }

  function handleToggle(checked: boolean) {
    skipSaveRef.current = true;
    setIsRecurring(checked);
    if (!checked) {
      persist(false, null);
      return;
    }
    const nextRule = defaultRecurrenceRule();
    setRule(nextRule);
    persist(true, nextRule);
  }

  function toggleDay(day: string) {
    setRule((prev) => {
      const days = prev.days ?? [];
      const next = days.includes(day)
        ? days.filter((d) => d !== day)
        : [...days, day];
      return { ...prev, days: next.length > 0 ? next : [day] };
    });
  }

  return (
    <section className="space-y-3 rounded-lg border border-border p-3">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={isRecurring}
          disabled={isPending}
          onChange={(e) => handleToggle(e.target.checked)}
          className="size-4 rounded"
        />
        Recurring task
      </label>

      {isRecurring ? (
        <div className="space-y-3 border-t border-border pt-3">
          <div>
            <Label htmlFor="recurrence_frequency">Frequency</Label>
            <select
              id="recurrence_frequency"
              value={rule.frequency}
              disabled={isPending}
              onChange={(e) =>
                setRule((prev) => ({
                  ...prev,
                  frequency: e.target.value as RecurrenceFrequency,
                }))
              }
              className="mt-1.5 h-8 w-full rounded-lg border border-input px-2.5 text-sm dark:bg-input/30"
            >
              {FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {rule.frequency === "weekly" || rule.frequency === "biweekly" ? (
            <div>
              <Label>Days of week</Label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {WEEKDAY_OPTIONS.map((day) => {
                  const selected = (rule.days ?? []).includes(day.value);
                  return (
                    <button
                      key={day.value}
                      type="button"
                      disabled={isPending}
                      onClick={() => toggleDay(day.value)}
                      className={`rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {rule.frequency === "monthly" ? (
            <div>
              <Label htmlFor="recurrence_day_of_month">Day of month</Label>
              <Input
                id="recurrence_day_of_month"
                type="number"
                min={1}
                max={31}
                disabled={isPending}
                value={rule.dayOfMonth ?? 1}
                onChange={(e) =>
                  setRule((prev) => ({
                    ...prev,
                    dayOfMonth: Math.min(
                      31,
                      Math.max(1, Number(e.target.value) || 1),
                    ),
                  }))
                }
                className="mt-1.5 h-8 w-24"
              />
            </div>
          ) : null}

          {rule.frequency === "custom" ? (
            <div>
              <Label htmlFor="recurrence_custom">Schedule description</Label>
              <Input
                id="recurrence_custom"
                disabled={isPending}
                value={rule.custom ?? ""}
                placeholder="e.g. Every 3rd Friday"
                onChange={(e) =>
                  setRule((prev) => ({ ...prev, custom: e.target.value }))
                }
                className="mt-1.5 h-8"
              />
            </div>
          ) : null}

          <div>
            <Label htmlFor="recurrence_until">Repeat until</Label>
            <Input
              id="recurrence_until"
              type="date"
              disabled={isPending}
              value={rule.until ?? ""}
              onChange={(e) =>
                setRule((prev) => ({
                  ...prev,
                  until: e.target.value || undefined,
                }))
              }
              className="mt-1.5 h-8"
            />
          </div>

          <div>
            <Label>Next occurrence</Label>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {rule.frequency === "custom"
                ? rule.custom?.trim() || "Define a custom schedule"
                : formatNextOccurrence(nextOccurrence)}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
