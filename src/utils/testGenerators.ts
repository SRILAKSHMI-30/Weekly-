/**
 * Custom fast-check generators for property-based testing
 * These generators create test data for the Weekly Course Tracker
 */

import * as fc from 'fast-check';

/**
 * Generates a valid ISO week number (1-53)
 */
export function arbitraryWeekNumber(): fc.Arbitrary<number> {
  return fc.integer({ min: 1, max: 53 });
}

/**
 * Generates a string composed entirely of whitespace characters
 */
export function arbitraryWhitespaceString(): fc.Arbitrary<string> {
  return fc.oneof(
    fc.constant(''),
    fc.constant(' '),
    fc.constant('  '),
    fc.constant('   '),
    fc.constant('\t'),
    fc.constant('\n'),
    fc.constant('\r'),
    fc.constant(' \t\n'),
    fc.constant('  \t  \n  '),
    fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 1, maxLength: 10 })
  );
}

/**
 * Generates a date in the past (up to 1 year ago)
 */
export function arbitraryPastDate(): fc.Arbitrary<Date> {
  const now = Date.now();
  const oneYearAgo = now - (365 * 24 * 60 * 60 * 1000);
  
  return fc.integer({ min: oneYearAgo, max: now - 1 }).map(timestamp => new Date(timestamp));
}

/**
 * Generates a date in the future (up to 1 year ahead)
 */
export function arbitraryFutureDate(): fc.Arbitrary<Date> {
  const now = Date.now();
  const oneYearAhead = now + (365 * 24 * 60 * 60 * 1000);
  
  return fc.integer({ min: now + 1, max: oneYearAhead }).map(timestamp => new Date(timestamp));
}

/**
 * Generates a valid Course object
 */
export function arbitraryCourse(): fc.Arbitrary<{
  id: string;
  name: string;
  department: string;
  createdAt: Date;
}> {
  return fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
    department: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() })
  });
}

/**
 * Generates a valid Task object with realistic deadlines
 */
export function arbitraryTask(): fc.Arbitrary<{
  id: string;
  courseId: string;
  description: string;
  deadline: Date;
  completed: boolean;
  completedAt?: Date;
  createdAt: Date;
}> {
  return fc.record({
    id: fc.uuid(),
    courseId: fc.uuid(),
    description: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
    deadline: fc.date({ 
      min: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      max: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)  // 90 days ahead
    }),
    completed: fc.boolean(),
    completedAt: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date() }), { nil: undefined }),
    createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() })
  });
}
