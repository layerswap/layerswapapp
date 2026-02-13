/**
 * Shared utilities for numeric input components.
 * Pure functions - no DOM mutation.
 */

/** Replaces commas with dots in a numeric string. */
export function replaceCommaInString(value: string): string {
  return value.replace(/,/g, ".");
}

/** Truncates a numeric string to the specified decimal precision. */
export function truncateToPrecision(str: string, precision: number): string {
  const s = str.toString();
  const dotIndex = s.indexOf(".");
  if (dotIndex === -1) return s;
  const truncated = s.slice(0, dotIndex + precision + 1);
  return Number(truncated).toString();
}

/** Limits decimal places in a numeric string. Returns unchanged if no truncation needed. */
export function limitDecimalPlacesInString(
  value: string,
  precision?: number
): string {
  if (precision === undefined || value.indexOf(".") === -1) return value;
  if (value.length - value.indexOf(".") - 1 <= precision) return value;
  return truncateToPrecision(value, precision);
}

/** Sanitizes numeric input: replaces commas and limits decimal places. */
export function sanitizeNumericInput(
  value: string,
  precision?: number
): string {
  return limitDecimalPlacesInString(replaceCommaInString(value), precision);
}
