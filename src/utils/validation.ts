/**
 * Validation utilities for the Weekly Course Tracker
 */

/**
 * Validates that a string is non-empty after trimming whitespace
 * @param value - The string to validate
 * @returns The trimmed string if valid, null otherwise
 */
export function validateNonEmptyString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Validates that a value is a valid Date object
 * @param value - The value to validate
 * @returns true if the value is a valid Date, false otherwise
 */
export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * Validates that a date is in the future
 * @param date - The date to validate
 * @returns true if the date is in the future, false otherwise
 */
export function isFutureDate(date: Date): boolean {
  if (!isValidDate(date)) {
    return false;
  }
  return date.getTime() > Date.now();
}
