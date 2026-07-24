const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function parseNonNegativeInteger(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return 0;
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isInteger(amount) && amount >= 0 ? amount : null;
}

export function isPositiveIntegerAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

export function isValidUsageDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}
