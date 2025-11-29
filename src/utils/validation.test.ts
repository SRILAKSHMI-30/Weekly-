import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateNonEmptyString, isValidDate, isFutureDate } from './validation';
import { arbitraryWhitespaceString } from './testGenerators';

describe('validateNonEmptyString', () => {
  it('should return trimmed string for valid non-empty input', () => {
    expect(validateNonEmptyString('hello')).toBe('hello');
    expect(validateNonEmptyString('  hello  ')).toBe('hello');
    expect(validateNonEmptyString('  hello world  ')).toBe('hello world');
  });

  it('should return null for empty or whitespace-only strings', () => {
    expect(validateNonEmptyString('')).toBe(null);
    expect(validateNonEmptyString('   ')).toBe(null);
    expect(validateNonEmptyString('\t\n')).toBe(null);
  });

  /**
   * Feature: weekly-course-tracker, Property 2: Empty course name rejection
   * Validates: Requirements 1.2
   */
  it('should reject any whitespace-only string', () => {
    fc.assert(
      fc.property(
        arbitraryWhitespaceString(),
        (whitespaceStr) => {
          const result = validateNonEmptyString(whitespaceStr);
          expect(result).toBe(null);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('isValidDate', () => {
  it('should return true for valid Date objects', () => {
    expect(isValidDate(new Date())).toBe(true);
    expect(isValidDate(new Date('2024-01-01'))).toBe(true);
    expect(isValidDate(new Date(2024, 0, 1))).toBe(true);
  });

  it('should return false for invalid dates', () => {
    expect(isValidDate(new Date('invalid'))).toBe(false);
    expect(isValidDate('2024-01-01')).toBe(false);
    expect(isValidDate(123456789)).toBe(false);
    expect(isValidDate(null)).toBe(false);
    expect(isValidDate(undefined)).toBe(false);
  });
});

describe('isFutureDate', () => {
  it('should return true for dates in the future', () => {
    const futureDate = new Date(Date.now() + 86400000); // Tomorrow
    expect(isFutureDate(futureDate)).toBe(true);
  });

  it('should return false for dates in the past', () => {
    const pastDate = new Date(Date.now() - 86400000); // Yesterday
    expect(isFutureDate(pastDate)).toBe(false);
  });

  it('should return false for invalid dates', () => {
    expect(isFutureDate(new Date('invalid'))).toBe(false);
  });
});

describe('Task validation properties', () => {
  /**
   * Feature: weekly-course-tracker, Property 6: Task validation
   * Validates: Requirements 2.2
   */
  it('should reject whitespace-only task descriptions', () => {
    fc.assert(
      fc.property(
        arbitraryWhitespaceString(),
        (whitespaceStr) => {
          const result = validateNonEmptyString(whitespaceStr);
          expect(result).toBe(null);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: weekly-course-tracker, Property 6: Task validation
   * Validates: Requirements 2.2
   */
  it('should reject invalid dates for task deadlines', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(new Date('invalid')),
          fc.constant(new Date('not a date')),
          fc.constant(new Date(NaN))
        ),
        (invalidDate) => {
          const result = isValidDate(invalidDate);
          expect(result).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
