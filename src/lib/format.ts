export function formatRsd(value: number): string {
  return new Intl.NumberFormat("sr-RS", {
    style: "currency",
    currency: "RSD",
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

export function formatHours(value: number): string {
  return new Intl.NumberFormat("sr-RS", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatPoints(value: number): string {
  return new Intl.NumberFormat("sr-RS", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${new Intl.NumberFormat("sr-RS", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(value))}%`;
}
