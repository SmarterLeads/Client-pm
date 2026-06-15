import type { ClientCurrency } from "@/lib/clients/overview-fields";

export type ClientHourlyWorkSummary = {
  billableHours: number;
  hourlyRate: number;
  amountDue: number;
};

export function formatBillableHours(hours: number): string {
  const rounded = Math.round(hours * 10) / 10;
  const label = rounded === 1 ? "hr" : "hrs";
  return `${rounded} ${label}`;
}

export function formatHourlyRate(
  rate: number,
  currency: ClientCurrency = "CAD",
): string {
  const formatted = new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rate);
  const base = currency === "USD" ? `${formatted} USD` : formatted;
  return `${base}/hr`;
}

export function formatClientCurrencyAmount(
  amount: number,
  currency: ClientCurrency = "CAD",
): string {
  const formatted = new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return currency === "USD" ? `${formatted} USD` : formatted;
}

export function formatHourlyWorkSummary(
  hours: number,
  hourlyRate: number,
  currency: ClientCurrency = "CAD",
): string {
  const amountDue = hours * hourlyRate;
  return `${formatBillableHours(hours)} × ${formatHourlyRate(hourlyRate, currency)} = ${formatClientCurrencyAmount(amountDue, currency)}`;
}

export function buildClientHourlyWorkSummary(
  billableHours: number,
  hourlyRate: number,
): ClientHourlyWorkSummary {
  return {
    billableHours,
    hourlyRate,
    amountDue: billableHours * hourlyRate,
  };
}
