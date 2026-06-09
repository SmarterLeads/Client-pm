export function formatBusinessMrrCad(cents: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatBusinessMrrCadOrDash(cents: number): string {
  if (cents <= 0) return "—";
  return formatBusinessMrrCad(cents);
}
