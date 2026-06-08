"use client";

import {
  defaultRecurrenceRule,
  serializeRecurrenceRule,
  WEEKDAY_OPTIONS,
  type RecurrenceFrequency,
  type RecurrenceRule,
} from "@/lib/tasks/recurrence";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  sheetFieldLabelClassName,
  sheetInputClassName,
  sheetSelectClassName,
} from "@/components/ui/sheet-form";

const FREQUENCIES: { value: RecurrenceFrequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
];

type TaskRecurrenceFormFieldsProps = {
  isRecurring: boolean;
  rule: RecurrenceRule;
  onRecurringChange: (checked: boolean) => void;
  onRuleChange: (rule: RecurrenceRule) => void;
  disabled?: boolean;
};

export function TaskRecurrenceFormFields({
  isRecurring,
  rule,
  onRecurringChange,
  onRuleChange,
  disabled = false,
}: TaskRecurrenceFormFieldsProps) {
  function toggleDay(day: string) {
    const days = rule.days ?? [];
    const next = days.includes(day)
      ? days.filter((value) => value !== day)
      : [...days, day];
    onRuleChange({
      ...rule,
      days: next.length > 0 ? next : [day],
    });
  }

  return (
    <div className="space-y-3">
      <input
        type="hidden"
        name="is_recurring"
        value={isRecurring ? "true" : "false"}
      />
      <input
        type="hidden"
        name="recurrence_rule"
        value={isRecurring ? serializeRecurrenceRule(rule) : ""}
      />

      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={isRecurring}
          disabled={disabled}
          onChange={(event) => {
            const checked = event.target.checked;
            onRecurringChange(checked);
            if (checked) {
              onRuleChange(defaultRecurrenceRule());
            }
          }}
          className="size-4 rounded border-input"
        />
        Recurring task
      </label>

      {isRecurring ? (
        <div className="space-y-4 rounded-md border border-border p-4">
          <div>
            <label
              htmlFor="recurrence_frequency"
              className={sheetFieldLabelClassName}
            >
              Frequency
            </label>
            <select
              id="recurrence_frequency"
              value={rule.frequency}
              disabled={disabled}
              onChange={(event) =>
                onRuleChange({
                  ...rule,
                  frequency: event.target.value as RecurrenceFrequency,
                })
              }
              className={sheetSelectClassName}
            >
              {FREQUENCIES.map((frequency) => (
                <option key={frequency.value} value={frequency.value}>
                  {frequency.label}
                </option>
              ))}
            </select>
          </div>

          {rule.frequency === "weekly" || rule.frequency === "biweekly" ? (
            <div>
              <span className={sheetFieldLabelClassName}>Days of week</span>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAY_OPTIONS.map((day) => {
                  const selected = (rule.days ?? []).includes(day.value);
                  return (
                    <button
                      key={day.value}
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleDay(day.value)}
                      className={cn(
                        "rounded-md border px-2 py-1 text-xs font-medium transition-colors",
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:text-foreground",
                      )}
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
              <label
                htmlFor="recurrence_day_of_month"
                className={sheetFieldLabelClassName}
              >
                Day of month
              </label>
              <Input
                id="recurrence_day_of_month"
                type="number"
                min={1}
                max={31}
                disabled={disabled}
                value={rule.dayOfMonth ?? 1}
                onChange={(event) =>
                  onRuleChange({
                    ...rule,
                    dayOfMonth: Math.min(
                      31,
                      Math.max(1, Number(event.target.value) || 1),
                    ),
                  })
                }
                className={cn(sheetInputClassName, "w-24")}
              />
            </div>
          ) : null}

          <div>
            <label htmlFor="recurrence_until" className={sheetFieldLabelClassName}>
              Repeat until
            </label>
            <Input
              id="recurrence_until"
              type="date"
              disabled={disabled}
              value={rule.until ?? ""}
              onChange={(event) =>
                onRuleChange({
                  ...rule,
                  until: event.target.value || undefined,
                })
              }
              className={sheetInputClassName}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
