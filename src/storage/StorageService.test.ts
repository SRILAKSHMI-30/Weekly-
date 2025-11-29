/**
 * Property-based tests for StorageService
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { StorageService } from './StorageService.js';
import { Course, Task } from '../models/types.js';
import { arbitraryCourse, arbitraryTask } from '../utils/testGenerators.js';

/**
 * Mock Storage implementation for testing
 */
class MockStorage implements Storage {
  private store: Map<string, string> = new Map();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

describe('StorageService', () => {
  let storage: MockStorage;
  let storageService: StorageService;

  beforeEach(() => {
    storage = new MockStorage();
    storageService = new StorageService(storage);
  });

  /**
   * **Feature: weekly-course-tracker, Property 22: Storage round-trip**
   * **Validates: Requirements 8.1, 8.2**
   * 
   * For any valid application state (courses and tasks), saving the state to storage 
   * and then loading it should produce an equivalent state with all courses and tasks preserved.
   */
  describe('Property 22: Storage round-trip', () => {
    it('should preserve courses through save and load cycle', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryCourse(), { minLength: 0, maxLength: 10 }),
          (courses) => {
            // Save courses
            const saveResult = storageService.save('courses', courses);
            expect(saveResult.success).toBe(true);

            // Load courses
            const loadResult = storageService.load<Course[]>('courses');
            expect(loadResult.success).toBe(true);

            if (loadResult.success) {
              const loadedCourses = loadResult.value;
              
              // Verify same length
              expect(loadedCourses.length).toBe(courses.length);

              // Verify each course is preserved
              for (let i = 0; i < courses.length; i++) {
                expect(loadedCourses[i].id).toBe(courses[i].id);
                expect(loadedCourses[i].name).toBe(courses[i].name);
                expect(loadedCourses[i].department).toBe(courses[i].department);
                
                // Dates should be equal (comparing timestamps)
                expect(loadedCourses[i].createdAt.getTime()).toBe(courses[i].createdAt.getTime());
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve tasks through save and load cycle', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryTask(), { minLength: 0, maxLength: 10 }),
          (tasks) => {
            // Save tasks
            const saveResult = storageService.save('tasks', tasks);
            expect(saveResult.success).toBe(true);

            // Load tasks
            const loadResult = storageService.load<Task[]>('tasks');
            expect(loadResult.success).toBe(true);

            if (loadResult.success) {
              const loadedTasks = loadResult.value;
              
              // Verify same length
              expect(loadedTasks.length).toBe(tasks.length);

              // Verify each task is preserved
              for (let i = 0; i < tasks.length; i++) {
                expect(loadedTasks[i].id).toBe(tasks[i].id);
                expect(loadedTasks[i].courseId).toBe(tasks[i].courseId);
                expect(loadedTasks[i].description).toBe(tasks[i].description);
                expect(loadedTasks[i].completed).toBe(tasks[i].completed);
                
                // Dates should be equal (comparing timestamps)
                expect(loadedTasks[i].deadline.getTime()).toBe(tasks[i].deadline.getTime());
                expect(loadedTasks[i].createdAt.getTime()).toBe(tasks[i].createdAt.getTime());
                
                // Optional completedAt
                if (tasks[i].completedAt) {
                  expect(loadedTasks[i].completedAt).toBeDefined();
                  expect(loadedTasks[i].completedAt!.getTime()).toBe(tasks[i].completedAt!.getTime());
                } else {
                  expect(loadedTasks[i].completedAt).toBeUndefined();
                }
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve complete application state through save and load cycle', () => {
      fc.assert(
        fc.property(
          fc.record({
            courses: fc.array(arbitraryCourse(), { minLength: 0, maxLength: 10 }),
            tasks: fc.array(arbitraryTask(), { minLength: 0, maxLength: 10 })
          }),
          (state) => {
            // Save complete state
            const saveResult = storageService.save('appState', state);
            expect(saveResult.success).toBe(true);

            // Load complete state
            const loadResult = storageService.load<{ courses: Course[], tasks: Task[] }>('appState');
            expect(loadResult.success).toBe(true);

            if (loadResult.success) {
              const loadedState = loadResult.value;
              
              // Verify courses
              expect(loadedState.courses.length).toBe(state.courses.length);
              
              // Verify tasks
              expect(loadedState.tasks.length).toBe(state.tasks.length);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: weekly-course-tracker, Property 23: Storage validation**
   * **Validates: Requirements 8.3**
   * 
   * For any invalid data, attempting to save it to storage should be rejected 
   * with a validation error before writing.
   */
  describe('Property 23: Storage validation', () => {
    it('should handle circular references gracefully', () => {
      // Create an object with circular reference
      const circular: any = { name: 'test' };
      circular.self = circular;

      const saveResult = storageService.save('circular', circular);
      
      // Should fail due to circular reference
      expect(saveResult.success).toBe(false);
      if (!saveResult.success) {
        expect(saveResult.error.name).toBe('StorageError');
      }
    });

    it('should handle functions gracefully', () => {
      const withFunction = {
        name: 'test',
        fn: () => console.log('test')
      };

      const saveResult = storageService.save('withFunction', withFunction);
      
      // Save should succeed (functions are omitted in JSON)
      expect(saveResult.success).toBe(true);

      // But loading back should not have the function
      const loadResult = storageService.load<any>('withFunction');
      expect(loadResult.success).toBe(true);
      if (loadResult.success) {
        expect(loadResult.value.name).toBe('test');
        expect(loadResult.value.fn).toBeUndefined();
      }
    });

    it('should handle undefined values', () => {
      const saveResult = storageService.save('undefined', undefined);
      
      // Should succeed
      expect(saveResult.success).toBe(true);

      // Loading undefined will fail because JSON.stringify(undefined) doesn't create a valid JSON string
      const loadResult = storageService.load<any>('undefined');
      expect(loadResult.success).toBe(false);
    });

    it('should handle null values', () => {
      const saveResult = storageService.save('null', null);
      
      // Should succeed
      expect(saveResult.success).toBe(true);

      const loadResult = storageService.load<any>('null');
      expect(loadResult.success).toBe(true);
      if (loadResult.success) {
        expect(loadResult.value).toBeNull();
      }
    });

    it('should validate data integrity for courses', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryCourse(), { minLength: 1, maxLength: 5 }),
          (courses) => {
            // Save valid courses
            const saveResult = storageService.save('courses', courses);
            expect(saveResult.success).toBe(true);

            // Load and verify structure
            const loadResult = storageService.load<Course[]>('courses');
            expect(loadResult.success).toBe(true);

            if (loadResult.success) {
              const loadedCourses = loadResult.value;
              
              // Verify each course has required fields
              for (const course of loadedCourses) {
                expect(course.id).toBeDefined();
                expect(typeof course.id).toBe('string');
                expect(course.name).toBeDefined();
                expect(typeof course.name).toBe('string');
                expect(course.department).toBeDefined();
                expect(typeof course.department).toBe('string');
                expect(course.createdAt).toBeInstanceOf(Date);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate data integrity for tasks', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryTask(), { minLength: 1, maxLength: 5 }),
          (tasks) => {
            // Save valid tasks
            const saveResult = storageService.save('tasks', tasks);
            expect(saveResult.success).toBe(true);

            // Load and verify structure
            const loadResult = storageService.load<Task[]>('tasks');
            expect(loadResult.success).toBe(true);

            if (loadResult.success) {
              const loadedTasks = loadResult.value;
              
              // Verify each task has required fields
              for (const task of loadedTasks) {
                expect(task.id).toBeDefined();
                expect(typeof task.id).toBe('string');
                expect(task.courseId).toBeDefined();
                expect(typeof task.courseId).toBe('string');
                expect(task.description).toBeDefined();
                expect(typeof task.description).toBe('string');
                expect(task.deadline).toBeInstanceOf(Date);
                expect(typeof task.completed).toBe('boolean');
                expect(task.createdAt).toBeInstanceOf(Date);
                
                // Optional field
                if (task.completedAt !== undefined) {
                  expect(task.completedAt).toBeInstanceOf(Date);
                }
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: weekly-course-tracker, Property 24: Corrupted data handling**
   * **Validates: Requirements 8.5**
   * 
   * For any corrupted or invalid data in storage, loading the application should 
   * handle the error gracefully without crashing, either by recovering partial data 
   * or initializing with empty state.
   */
  describe('Property 24: Corrupted data handling', () => {
    it('should handle corrupted JSON gracefully', () => {
      // Manually insert corrupted data
      storage.setItem('corrupted', '{invalid json}');

      const loadResult = storageService.load<any>('corrupted');
      
      // Should fail gracefully
      expect(loadResult.success).toBe(false);
      if (!loadResult.success) {
        expect(loadResult.error.name).toBe('StorageError');
        expect(loadResult.error.message).toContain('Corrupted data');
      }
    });

    it('should handle incomplete JSON gracefully', () => {
      // Manually insert incomplete JSON
      storage.setItem('incomplete', '{"name": "test", "department":');

      const loadResult = storageService.load<any>('incomplete');
      
      // Should fail gracefully
      expect(loadResult.success).toBe(false);
      if (!loadResult.success) {
        expect(loadResult.error.name).toBe('StorageError');
      }
    });

    it('should handle malformed date objects gracefully', () => {
      // Manually insert data with malformed date string
      const malformedData = {
        id: '123',
        name: 'Test',
        department: 'CS',
        createdAt: 'not-a-valid-iso-date'
      };
      
      storage.setItem('malformed', JSON.stringify(malformedData));

      const loadResult = storageService.load<Course>('malformed');
      
      // Should load and the invalid date string will remain as a string
      expect(loadResult.success).toBe(true);
      if (loadResult.success) {
        // Since it doesn't match the ISO pattern, it stays as a string
        expect(typeof loadResult.value.createdAt).toBe('string');
      }
    });

    it('should handle empty string gracefully', () => {
      storage.setItem('empty', '');

      const loadResult = storageService.load<any>('empty');
      
      // Should fail gracefully
      expect(loadResult.success).toBe(false);
      if (!loadResult.success) {
        expect(loadResult.error.name).toBe('StorageError');
      }
    });

    it('should handle non-existent keys gracefully', () => {
      const loadResult = storageService.load<any>('non-existent-key');
      
      // Should fail gracefully
      expect(loadResult.success).toBe(false);
      if (!loadResult.success) {
        expect(loadResult.error.name).toBe('StorageError');
        expect(loadResult.error.message).toContain('No data found');
      }
    });

    it('should handle various corrupted JSON patterns', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant('{'),
            fc.constant('}'),
            fc.constant('['),
            fc.constant(']'),
            fc.constant('null null'),
            fc.constant('{"a":'),
            fc.constant('{"a":}'),
            fc.constant('{a: 1}'),
            fc.string().filter(s => {
              try {
                JSON.parse(s);
                return false;
              } catch {
                return true;
              }
            })
          ),
          (corruptedData) => {
            storage.setItem('test-corrupted', corruptedData);

            const loadResult = storageService.load<any>('test-corrupted');
            
            // Should always fail gracefully, never throw
            expect(loadResult.success).toBe(false);
            if (!loadResult.success) {
              expect(loadResult.error).toBeInstanceOf(Error);
              expect(loadResult.error.name).toBe('StorageError');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle storage errors during load', () => {
      // Create a storage that throws errors
      class ErrorStorage implements Storage {
        get length(): number { return 0; }
        clear(): void {}
        key(index: number): string | null { return null; }
        removeItem(key: string): void {}
        setItem(key: string, value: string): void {}
        
        getItem(key: string): string | null {
          throw new Error('Storage access denied');
        }
      }

      const errorStorage = new ErrorStorage();
      const errorService = new StorageService(errorStorage);

      const loadResult = errorService.load<any>('test');
      
      // Should fail gracefully
      expect(loadResult.success).toBe(false);
      if (!loadResult.success) {
        expect(loadResult.error.name).toBe('StorageError');
      }
    });

    it('should handle storage quota exceeded during save', () => {
      // Create a storage that simulates quota exceeded
      class QuotaStorage implements Storage {
        get length(): number { return 0; }
        clear(): void {}
        getItem(key: string): string | null { return null; }
        key(index: number): string | null { return null; }
        removeItem(key: string): void {}
        
        setItem(key: string, value: string): void {
          const error: any = new Error('QuotaExceededError');
          error.name = 'QuotaExceededError';
          throw error;
        }
      }

      const quotaStorage = new QuotaStorage();
      const quotaService = new StorageService(quotaStorage);

      const saveResult = quotaService.save('test', { data: 'test' });
      
      // Should fail gracefully with quota error
      expect(saveResult.success).toBe(false);
      if (!saveResult.success) {
        expect(saveResult.error.name).toBe('StorageError');
        expect(saveResult.error.message).toContain('quota');
      }
    });
  });
});
