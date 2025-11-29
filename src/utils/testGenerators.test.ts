import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  arbitraryWeekNumber,
  arbitraryWhitespaceString,
  arbitraryPastDate,
  arbitraryFutureDate,
  arbitraryCourse,
  arbitraryTask
} from './testGenerators';

describe('testGenerators', () => {
  describe('arbitraryWeekNumber', () => {
    it('should generate week numbers between 1 and 53', () => {
      fc.assert(
        fc.property(arbitraryWeekNumber(), (weekNumber) => {
          expect(weekNumber).toBeGreaterThanOrEqual(1);
          expect(weekNumber).toBeLessThanOrEqual(53);
          expect(Number.isInteger(weekNumber)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('arbitraryWhitespaceString', () => {
    it('should generate strings composed only of whitespace', () => {
      fc.assert(
        fc.property(arbitraryWhitespaceString(), (str) => {
          expect(str.trim()).toBe('');
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('arbitraryPastDate', () => {
    it('should generate dates in the past', () => {
      fc.assert(
        fc.property(arbitraryPastDate(), (date) => {
          expect(date.getTime()).toBeLessThan(Date.now());
          expect(date instanceof Date).toBe(true);
          expect(isNaN(date.getTime())).toBe(false);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('arbitraryFutureDate', () => {
    it('should generate dates in the future', () => {
      const testStartTime = Date.now();
      fc.assert(
        fc.property(arbitraryFutureDate(), (date) => {
          expect(date.getTime()).toBeGreaterThanOrEqual(testStartTime);
          expect(date instanceof Date).toBe(true);
          expect(isNaN(date.getTime())).toBe(false);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('arbitraryCourse', () => {
    it('should generate valid course objects', () => {
      fc.assert(
        fc.property(arbitraryCourse(), (course) => {
          // Validate structure
          expect(course).toHaveProperty('id');
          expect(course).toHaveProperty('name');
          expect(course).toHaveProperty('department');
          expect(course).toHaveProperty('createdAt');
          
          // Validate types
          expect(typeof course.id).toBe('string');
          expect(typeof course.name).toBe('string');
          expect(typeof course.department).toBe('string');
          expect(course.createdAt instanceof Date).toBe(true);
          
          // Validate non-empty strings
          expect(course.name.trim().length).toBeGreaterThan(0);
          expect(course.department.trim().length).toBeGreaterThan(0);
          
          // Validate UUID format
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          expect(course.id).toMatch(uuidRegex);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('arbitraryTask', () => {
    it('should generate valid task objects', () => {
      fc.assert(
        fc.property(arbitraryTask(), (task) => {
          // Validate structure
          expect(task).toHaveProperty('id');
          expect(task).toHaveProperty('courseId');
          expect(task).toHaveProperty('description');
          expect(task).toHaveProperty('deadline');
          expect(task).toHaveProperty('completed');
          expect(task).toHaveProperty('createdAt');
          
          // Validate types
          expect(typeof task.id).toBe('string');
          expect(typeof task.courseId).toBe('string');
          expect(typeof task.description).toBe('string');
          expect(task.deadline instanceof Date).toBe(true);
          expect(typeof task.completed).toBe('boolean');
          expect(task.createdAt instanceof Date).toBe(true);
          
          // Validate non-empty description
          expect(task.description.trim().length).toBeGreaterThan(0);
          
          // Validate UUID formats
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          expect(task.id).toMatch(uuidRegex);
          expect(task.courseId).toMatch(uuidRegex);
          
          // Validate dates are valid
          expect(isNaN(task.deadline.getTime())).toBe(false);
          expect(isNaN(task.createdAt.getTime())).toBe(false);
          
          // Validate completedAt if present
          if (task.completedAt !== undefined) {
            expect(task.completedAt instanceof Date).toBe(true);
            expect(isNaN(task.completedAt.getTime())).toBe(false);
          }
        }),
        { numRuns: 100 }
      );
    });
  });
});
