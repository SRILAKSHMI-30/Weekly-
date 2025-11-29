/**
 * Property-based tests for CourseService
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { CourseService } from './CourseService.js';
import { TaskService } from './TaskService.js';
import { StorageService } from '../storage/StorageService.js';
import { ValidationError, NotFoundError } from '../models/errors.js';
import { Course, Task, Result } from '../models/types.js';

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

describe('CourseService', () => {
  let storage: MockStorage;
  let storageService: StorageService;
  let courseService: CourseService;

  beforeEach(() => {
    storage = new MockStorage();
    storageService = new StorageService(storage);
    courseService = new CourseService(storageService);
  });

  /**
   * **Feature: weekly-course-tracker, Property 1: Course creation with valid data**
   * **Validates: Requirements 1.1, 1.3**
   * 
   * For any non-empty course name and department, creating a course should result in 
   * a course object with a unique ID, the specified name and department, and a creation timestamp.
   */
  describe('Property 1: Course creation with valid data', () => {
    it('should create courses with unique IDs for any valid name and department', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
          (name: string, department: string) => {
            // Reset service for each test
            storage.clear();
            const freshStorageService = new StorageService(storage);
            const freshCourseService = new CourseService(freshStorageService);

            const result = freshCourseService.createCourse(name, department);
            
            // Should succeed
            expect(result.success).toBe(true);
            
            if (result.success) {
              // Should have a unique ID
              expect(result.value.id).toBeDefined();
              expect(typeof result.value.id).toBe('string');
              expect(result.value.id.length).toBeGreaterThan(0);
              
              // Should have the trimmed name and department
              expect(result.value.name).toBe(name.trim());
              expect(result.value.department).toBe(department.trim());
              
              // Should have a creation timestamp
              expect(result.value.createdAt).toBeInstanceOf(Date);
              expect(result.value.createdAt.getTime()).toBeLessThanOrEqual(Date.now());
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should create multiple courses with unique IDs', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
              department: fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0)
            }),
            { minLength: 2, maxLength: 10 }
          ).filter((courses) => {
            // Ensure all courses have unique (name, department) pairs
            const seen = new Set<string>();
            for (const course of courses) {
              const key = `${course.name.trim()}:${course.department.trim()}`;
              if (seen.has(key)) return false;
              seen.add(key);
            }
            return true;
          }),
          (coursesData) => {
            // Reset service for each test
            storage.clear();
            const freshStorageService = new StorageService(storage);
            const freshCourseService = new CourseService(freshStorageService);

            const createdCourses: Array<{ id: string; name: string; department: string; createdAt: Date }> = [];
            
            // Create all courses
            for (const courseData of coursesData) {
              const result = freshCourseService.createCourse(courseData.name, courseData.department);
              expect(result.success).toBe(true);
              if (result.success) {
                createdCourses.push(result.value);
              }
            }

            // Verify all IDs are unique
            const ids = new Set(createdCourses.map(c => c.id));
            expect(ids.size).toBe(createdCourses.length);

            // Verify all courses can be retrieved
            for (const course of createdCourses) {
              const retrieved = freshCourseService.getCourse(course.id);
              expect(retrieved).not.toBeNull();
              if (retrieved) {
                expect(retrieved.id).toBe(course.id);
                expect(retrieved.name).toBe(course.name);
                expect(retrieved.department).toBe(course.department);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: weekly-course-tracker, Property 3: Course grouping by department**
   * **Validates: Requirements 1.4**
   * 
   * For any collection of courses, grouping them by department should return a map 
   * where each department contains only courses belonging to that department, 
   * and all courses appear exactly once.
   */
  describe('Property 3: Course grouping by department', () => {
    it('should group courses by department with each course appearing exactly once', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
              department: fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0)
            }),
            { minLength: 1, maxLength: 20 }
          ).filter((courses) => {
            // Ensure all courses have unique (name, department) pairs
            const seen = new Set<string>();
            for (const course of courses) {
              const key = `${course.name.trim()}:${course.department.trim()}`;
              if (seen.has(key)) return false;
              seen.add(key);
            }
            return true;
          }),
          (coursesData) => {
            // Reset service for each test
            storage.clear();
            const freshStorageService = new StorageService(storage);
            const freshCourseService = new CourseService(freshStorageService);

            // Create all courses
            const createdCourses: Course[] = [];
            for (const courseData of coursesData) {
              const result = freshCourseService.createCourse(courseData.name, courseData.department);
              expect(result.success).toBe(true);
              if (result.success) {
                createdCourses.push(result.value);
              }
            }

            // Get courses grouped by department
            const grouped = freshCourseService.getCoursesByDepartment();

            // Verify all courses appear exactly once
            const allCoursesFromGroups: Course[] = [];
            for (const departmentCourses of grouped.values()) {
              allCoursesFromGroups.push(...departmentCourses);
            }
            expect(allCoursesFromGroups.length).toBe(createdCourses.length);

            // Verify each course appears exactly once
            const courseIds = new Set(createdCourses.map(c => c.id));
            const groupedCourseIds = new Set(allCoursesFromGroups.map(c => c.id));
            expect(groupedCourseIds.size).toBe(courseIds.size);
            for (const id of courseIds) {
              expect(groupedCourseIds.has(id)).toBe(true);
            }

            // Verify each department contains only courses from that department
            for (const [department, departmentCourses] of grouped.entries()) {
              for (const course of departmentCourses) {
                expect(course.department).toBe(department);
              }
            }

            // Verify the number of departments matches unique departments in created courses
            const uniqueDepartments = new Set(createdCourses.map(c => c.department));
            expect(grouped.size).toBe(uniqueDepartments.size);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return empty map when no courses exist', () => {
      storage.clear();
      const freshStorageService = new StorageService(storage);
      const freshCourseService = new CourseService(freshStorageService);

      const grouped = freshCourseService.getCoursesByDepartment();
      expect(grouped.size).toBe(0);
    });

    it('should handle single department with multiple courses', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
          fc.array(
            fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
            { minLength: 2, maxLength: 10 }
          ).filter((names) => {
            // Ensure all names are unique
            const uniqueNames = new Set(names.map(n => n.trim()));
            return uniqueNames.size === names.length;
          }),
          (department: string, courseNames: string[]) => {
            // Reset service for each test
            storage.clear();
            const freshStorageService = new StorageService(storage);
            const freshCourseService = new CourseService(freshStorageService);

            // Create all courses in the same department
            for (const name of courseNames) {
              const result = freshCourseService.createCourse(name, department);
              expect(result.success).toBe(true);
            }

            // Get courses grouped by department
            const grouped = freshCourseService.getCoursesByDepartment();

            // Should have exactly one department
            expect(grouped.size).toBe(1);

            // That department should contain all courses
            const departmentCourses = grouped.get(department.trim());
            expect(departmentCourses).toBeDefined();
            expect(departmentCourses?.length).toBe(courseNames.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: weekly-course-tracker, Property 4: Duplicate course prevention**
   * **Validates: Requirements 1.5**
   * 
   * For any existing course, attempting to create another course with the same name 
   * and department should be rejected.
   */
  describe('Property 4: Duplicate course prevention', () => {
    it('should reject duplicate courses with the same name and department', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
          (name: string, department: string) => {
            // Reset service for each test
            storage.clear();
            const freshStorageService = new StorageService(storage);
            const freshCourseService = new CourseService(freshStorageService);

            // Create the first course
            const firstResult = freshCourseService.createCourse(name, department);
            expect(firstResult.success).toBe(true);

            // Attempt to create a duplicate course
            const duplicateResult = freshCourseService.createCourse(name, department);
            
            // Should fail
            expect(duplicateResult.success).toBe(false);
            
            if (!duplicateResult.success) {
              // Should have a validation error
              expect(duplicateResult.error).toBeInstanceOf(ValidationError);
              expect(duplicateResult.error.message).toContain(name.trim());
              expect(duplicateResult.error.message).toContain(department.trim());
            }

            // Verify only one course exists
            const allCourses = freshCourseService.getAllCourses();
            expect(allCourses.length).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow courses with same name in different departments', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
          (name: string, department1: string, department2: string) => {
            // Skip if departments are the same after trimming
            if (department1.trim() === department2.trim()) {
              return;
            }

            // Reset service for each test
            storage.clear();
            const freshStorageService = new StorageService(storage);
            const freshCourseService = new CourseService(freshStorageService);

            // Create course in first department
            const firstResult = freshCourseService.createCourse(name, department1);
            expect(firstResult.success).toBe(true);

            // Create course with same name in different department
            const secondResult = freshCourseService.createCourse(name, department2);
            
            // Should succeed
            expect(secondResult.success).toBe(true);

            // Verify both courses exist
            const allCourses = freshCourseService.getAllCourses();
            expect(allCourses.length).toBe(2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle whitespace variations as duplicates', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
          fc.nat({ max: 5 }),
          fc.nat({ max: 5 }),
          (name: string, department: string, leadingSpaces: number, trailingSpaces: number) => {
            // Reset service for each test
            storage.clear();
            const freshStorageService = new StorageService(storage);
            const freshCourseService = new CourseService(freshStorageService);

            // Create the first course
            const firstResult = freshCourseService.createCourse(name, department);
            expect(firstResult.success).toBe(true);

            // Attempt to create a duplicate with extra whitespace
            const nameWithSpaces = ' '.repeat(leadingSpaces) + name + ' '.repeat(trailingSpaces);
            const deptWithSpaces = ' '.repeat(leadingSpaces) + department + ' '.repeat(trailingSpaces);
            const duplicateResult = freshCourseService.createCourse(nameWithSpaces, deptWithSpaces);
            
            // Should fail (whitespace should be trimmed and recognized as duplicate)
            expect(duplicateResult.success).toBe(false);

            // Verify only one course exists
            const allCourses = freshCourseService.getAllCourses();
            expect(allCourses.length).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: weekly-course-tracker, Property 18: Course update persistence**
   * **Validates: Requirements 7.1, 7.5**
   * 
   * For any existing course and valid updates, modifying the course should result in 
   * the course having the new values and all associated tasks reflecting the updated 
   * course information.
   */
  describe('Property 18: Course update persistence', () => {
    it('should persist course updates with new name', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
          (originalName: string, department: string, newName: string) => {
            // Skip if names are the same after trimming
            if (originalName.trim() === newName.trim()) {
              return;
            }

            // Reset service for each test
            storage.clear();
            const freshStorageService = new StorageService(storage);
            const freshCourseService = new CourseService(freshStorageService);

            // Create the original course
            const createResult = freshCourseService.createCourse(originalName, department);
            expect(createResult.success).toBe(true);
            
            if (!createResult.success) return;
            
            const originalCourse = createResult.value;
            const courseId = originalCourse.id;

            // Update the course name
            const updateResult = freshCourseService.updateCourse(courseId, { name: newName });
            
            // Should succeed
            expect(updateResult.success).toBe(true);
            
            if (!updateResult.success) return;
            
            const updatedCourse = updateResult.value;

            // Verify the course has the new name
            expect(updatedCourse.id).toBe(courseId);
            expect(updatedCourse.name).toBe(newName.trim());
            expect(updatedCourse.department).toBe(department.trim());
            expect(updatedCourse.createdAt).toEqual(originalCourse.createdAt);

            // Verify persistence: retrieve the course and check it has the new values
            const retrievedCourse = freshCourseService.getCourse(courseId);
            expect(retrievedCourse).not.toBeNull();
            
            if (retrievedCourse) {
              expect(retrievedCourse.id).toBe(courseId);
              expect(retrievedCourse.name).toBe(newName.trim());
              expect(retrievedCourse.department).toBe(department.trim());
            }

            // Verify persistence across service instances (simulating app restart)
            const newStorageService = new StorageService(storage);
            const newCourseService = new CourseService(newStorageService);
            
            const persistedCourse = newCourseService.getCourse(courseId);
            expect(persistedCourse).not.toBeNull();
            
            if (persistedCourse) {
              expect(persistedCourse.id).toBe(courseId);
              expect(persistedCourse.name).toBe(newName.trim());
              expect(persistedCourse.department).toBe(department.trim());
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should persist course updates with new department', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
          (name: string, originalDepartment: string, newDepartment: string) => {
            // Skip if departments are the same after trimming
            if (originalDepartment.trim() === newDepartment.trim()) {
              return;
            }

            // Reset service for each test
            storage.clear();
            const freshStorageService = new StorageService(storage);
            const freshCourseService = new CourseService(freshStorageService);

            // Create the original course
            const createResult = freshCourseService.createCourse(name, originalDepartment);
            expect(createResult.success).toBe(true);
            
            if (!createResult.success) return;
            
            const originalCourse = createResult.value;
            const courseId = originalCourse.id;

            // Update the course department
            const updateResult = freshCourseService.updateCourse(courseId, { department: newDepartment });
            
            // Should succeed
            expect(updateResult.success).toBe(true);
            
            if (!updateResult.success) return;
            
            const updatedCourse = updateResult.value;

            // Verify the course has the new department
            expect(updatedCourse.id).toBe(courseId);
            expect(updatedCourse.name).toBe(name.trim());
            expect(updatedCourse.department).toBe(newDepartment.trim());
            expect(updatedCourse.createdAt).toEqual(originalCourse.createdAt);

            // Verify persistence: retrieve the course and check it has the new values
            const retrievedCourse = freshCourseService.getCourse(courseId);
            expect(retrievedCourse).not.toBeNull();
            
            if (retrievedCourse) {
              expect(retrievedCourse.id).toBe(courseId);
              expect(retrievedCourse.name).toBe(name.trim());
              expect(retrievedCourse.department).toBe(newDepartment.trim());
            }

            // Verify persistence across service instances (simulating app restart)
            const newStorageService = new StorageService(storage);
            const newCourseService = new CourseService(newStorageService);
            
            const persistedCourse = newCourseService.getCourse(courseId);
            expect(persistedCourse).not.toBeNull();
            
            if (persistedCourse) {
              expect(persistedCourse.id).toBe(courseId);
              expect(persistedCourse.name).toBe(name.trim());
              expect(persistedCourse.department).toBe(newDepartment.trim());
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should persist course updates with both name and department', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
          (originalName: string, originalDepartment: string, newName: string, newDepartment: string) => {
            // Skip if both are the same after trimming
            if (originalName.trim() === newName.trim() && originalDepartment.trim() === newDepartment.trim()) {
              return;
            }

            // Reset service for each test
            storage.clear();
            const freshStorageService = new StorageService(storage);
            const freshCourseService = new CourseService(freshStorageService);

            // Create the original course
            const createResult = freshCourseService.createCourse(originalName, originalDepartment);
            expect(createResult.success).toBe(true);
            
            if (!createResult.success) return;
            
            const originalCourse = createResult.value;
            const courseId = originalCourse.id;

            // Update both name and department
            const updateResult = freshCourseService.updateCourse(courseId, { 
              name: newName, 
              department: newDepartment 
            });
            
            // Should succeed
            expect(updateResult.success).toBe(true);
            
            if (!updateResult.success) return;
            
            const updatedCourse = updateResult.value;

            // Verify the course has the new values
            expect(updatedCourse.id).toBe(courseId);
            expect(updatedCourse.name).toBe(newName.trim());
            expect(updatedCourse.department).toBe(newDepartment.trim());
            expect(updatedCourse.createdAt).toEqual(originalCourse.createdAt);

            // Verify persistence: retrieve the course and check it has the new values
            const retrievedCourse = freshCourseService.getCourse(courseId);
            expect(retrievedCourse).not.toBeNull();
            
            if (retrievedCourse) {
              expect(retrievedCourse.id).toBe(courseId);
              expect(retrievedCourse.name).toBe(newName.trim());
              expect(retrievedCourse.department).toBe(newDepartment.trim());
            }

            // Verify persistence across service instances (simulating app restart)
            const newStorageService = new StorageService(storage);
            const newCourseService = new CourseService(newStorageService);
            
            const persistedCourse = newCourseService.getCourse(courseId);
            expect(persistedCourse).not.toBeNull();
            
            if (persistedCourse) {
              expect(persistedCourse.id).toBe(courseId);
              expect(persistedCourse.name).toBe(newName.trim());
              expect(persistedCourse.department).toBe(newDepartment.trim());
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject updates with empty name or department', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
          fc.string({ maxLength: 20 }).filter((s: string) => s.trim().length === 0),
          (name: string, department: string, whitespaceString: string) => {
            // Reset service for each test
            storage.clear();
            const freshStorageService = new StorageService(storage);
            const freshCourseService = new CourseService(freshStorageService);

            // Create the original course
            const createResult = freshCourseService.createCourse(name, department);
            expect(createResult.success).toBe(true);
            
            if (!createResult.success) return;
            
            const courseId = createResult.value.id;

            // Attempt to update with empty name
            const updateNameResult = freshCourseService.updateCourse(courseId, { name: whitespaceString });
            expect(updateNameResult.success).toBe(false);
            
            if (!updateNameResult.success) {
              expect(updateNameResult.error).toBeInstanceOf(ValidationError);
            }

            // Attempt to update with empty department
            const updateDeptResult = freshCourseService.updateCourse(courseId, { department: whitespaceString });
            expect(updateDeptResult.success).toBe(false);
            
            if (!updateDeptResult.success) {
              expect(updateDeptResult.error).toBeInstanceOf(ValidationError);
            }

            // Verify original course is unchanged
            const retrievedCourse = freshCourseService.getCourse(courseId);
            expect(retrievedCourse).not.toBeNull();
            
            if (retrievedCourse) {
              expect(retrievedCourse.name).toBe(name.trim());
              expect(retrievedCourse.department).toBe(department.trim());
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject updates that would create duplicates', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
          (name1: string, name2: string, department: string) => {
            // Skip if names are the same after trimming
            if (name1.trim() === name2.trim()) {
              return;
            }

            // Reset service for each test
            storage.clear();
            const freshStorageService = new StorageService(storage);
            const freshCourseService = new CourseService(freshStorageService);

            // Create two courses in the same department
            const createResult1 = freshCourseService.createCourse(name1, department);
            const createResult2 = freshCourseService.createCourse(name2, department);
            
            expect(createResult1.success).toBe(true);
            expect(createResult2.success).toBe(true);
            
            if (!createResult1.success || !createResult2.success) return;
            
            const course1Id = createResult1.value.id;

            // Attempt to update course1 to have the same name as course2
            const updateResult = freshCourseService.updateCourse(course1Id, { name: name2 });
            
            // Should fail due to duplicate
            expect(updateResult.success).toBe(false);
            
            if (!updateResult.success) {
              expect(updateResult.error).toBeInstanceOf(ValidationError);
              expect(updateResult.error.message).toContain(name2.trim());
            }

            // Verify course1 is unchanged
            const retrievedCourse = freshCourseService.getCourse(course1Id);
            expect(retrievedCourse).not.toBeNull();
            
            if (retrievedCourse) {
              expect(retrievedCourse.name).toBe(name1.trim());
              expect(retrievedCourse.department).toBe(department.trim());
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle updates to non-existent courses', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
          (nonExistentId: string, newName: string) => {
            // Reset service for each test
            storage.clear();
            const freshStorageService = new StorageService(storage);
            const freshCourseService = new CourseService(freshStorageService);

            // Attempt to update a non-existent course
            const updateResult = freshCourseService.updateCourse(nonExistentId, { name: newName });
            
            // Should fail
            expect(updateResult.success).toBe(false);
            
            if (!updateResult.success) {
              expect(updateResult.error).toBeInstanceOf(ValidationError);
              expect(updateResult.error.message).toContain(nonExistentId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: weekly-course-tracker, Property 19: Course deletion**
   * **Validates: Requirements 7.2**
   * 
   * For any existing course, deleting it should result in the course no longer 
   * being retrievable from the system.
   */
  describe('Property 19: Course deletion', () => {
    it('should delete courses and make them non-retrievable', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
          (name: string, department: string) => {
            // Reset service for each test
            storage.clear();
            const freshStorageService = new StorageService(storage);
            const freshCourseService = new CourseService(freshStorageService);

            // Create a course
            const createResult = freshCourseService.createCourse(name, department);
            expect(createResult.success).toBe(true);
            
            if (!createResult.success) return;
            
            const course = createResult.value;
            const courseId = course.id;

            // Verify the course exists
            const retrievedBefore = freshCourseService.getCourse(courseId);
            expect(retrievedBefore).not.toBeNull();
            expect(retrievedBefore?.id).toBe(courseId);

            // Delete the course
            const deleteResult = freshCourseService.deleteCourse(courseId);
            
            // Should succeed
            expect(deleteResult.success).toBe(true);

            // Verify the course is no longer retrievable
            const retrievedAfter = freshCourseService.getCourse(courseId);
            expect(retrievedAfter).toBeNull();

            // Verify the course is not in the list of all courses
            const allCourses = freshCourseService.getAllCourses();
            const foundInList = allCourses.find(c => c.id === courseId);
            expect(foundInList).toBeUndefined();

            // Verify persistence: course should remain deleted after service restart
            const newStorageService = new StorageService(storage);
            const newCourseService = new CourseService(newStorageService);
            
            const persistedCourse = newCourseService.getCourse(courseId);
            expect(persistedCourse).toBeNull();
            
            const persistedAllCourses = newCourseService.getAllCourses();
            const foundInPersistedList = persistedAllCourses.find(c => c.id === courseId);
            expect(foundInPersistedList).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should delete multiple courses independently', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
              department: fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0)
            }),
            { minLength: 2, maxLength: 10 }
          ).filter((courses) => {
            // Ensure all courses have unique (name, department) pairs
            const seen = new Set<string>();
            for (const course of courses) {
              const key = `${course.name.trim()}:${course.department.trim()}`;
              if (seen.has(key)) return false;
              seen.add(key);
            }
            return true;
          }),
          fc.nat(),
          (coursesData, deleteIndexSeed) => {
            // Reset service for each test
            storage.clear();
            const freshStorageService = new StorageService(storage);
            const freshCourseService = new CourseService(freshStorageService);

            // Create all courses
            const createdCourses: Course[] = [];
            for (const courseData of coursesData) {
              const result = freshCourseService.createCourse(courseData.name, courseData.department);
              expect(result.success).toBe(true);
              if (result.success) {
                createdCourses.push(result.value);
              }
            }

            // Select a course to delete
            const deleteIndex = deleteIndexSeed % createdCourses.length;
            const courseToDelete = createdCourses[deleteIndex];
            const remainingCourses = createdCourses.filter((_, i) => i !== deleteIndex);

            // Delete the selected course
            const deleteResult = freshCourseService.deleteCourse(courseToDelete.id);
            expect(deleteResult.success).toBe(true);

            // Verify the deleted course is not retrievable
            const deletedCourse = freshCourseService.getCourse(courseToDelete.id);
            expect(deletedCourse).toBeNull();

            // Verify all other courses are still retrievable
            for (const course of remainingCourses) {
              const retrieved = freshCourseService.getCourse(course.id);
              expect(retrieved).not.toBeNull();
              expect(retrieved?.id).toBe(course.id);
              expect(retrieved?.name).toBe(course.name);
              expect(retrieved?.department).toBe(course.department);
            }

            // Verify the total count is correct
            const allCourses = freshCourseService.getAllCourses();
            expect(allCourses.length).toBe(remainingCourses.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle deletion of non-existent courses', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          (nonExistentId: string) => {
            // Reset service for each test
            storage.clear();
            const freshStorageService = new StorageService(storage);
            const freshCourseService = new CourseService(freshStorageService);

            // Attempt to delete a non-existent course
            const deleteResult = freshCourseService.deleteCourse(nonExistentId);
            
            // Should fail
            expect(deleteResult.success).toBe(false);
            
            if (!deleteResult.success) {
              expect(deleteResult.error.message).toContain(nonExistentId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow re-creating a course after deletion', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
          (name: string, department: string) => {
            // Reset service for each test
            storage.clear();
            const freshStorageService = new StorageService(storage);
            const freshCourseService = new CourseService(freshStorageService);

            // Create a course
            const createResult1 = freshCourseService.createCourse(name, department);
            expect(createResult1.success).toBe(true);
            
            if (!createResult1.success) return;
            
            const course1Id = createResult1.value.id;

            // Delete the course
            const deleteResult = freshCourseService.deleteCourse(course1Id);
            expect(deleteResult.success).toBe(true);

            // Re-create the course with the same name and department
            const createResult2 = freshCourseService.createCourse(name, department);
            
            // Should succeed
            expect(createResult2.success).toBe(true);
            
            if (!createResult2.success) return;
            
            const course2 = createResult2.value;

            // Should have a different ID
            expect(course2.id).not.toBe(course1Id);
            
            // Should have the same name and department
            expect(course2.name).toBe(name.trim());
            expect(course2.department).toBe(department.trim());

            // Should be retrievable
            const retrieved = freshCourseService.getCourse(course2.id);
            expect(retrieved).not.toBeNull();
            expect(retrieved?.id).toBe(course2.id);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: weekly-course-tracker, Property 21: Course list with task counts**
   * **Validates: Requirements 7.4**
   * 
   * For any collection of courses, the course list display should show each course 
   * with an accurate count of its associated tasks.
   */
  describe('Property 21: Course list with task counts', () => {
    /**
     * Minimal Task interface for testing
     */
    interface Task {
      id: string;
      courseId: string;
      description: string;
      deadline: Date;
      completed: boolean;
      completedAt?: Date;
      createdAt: Date;
    }

    /**
     * Mock TaskService for testing course-task integration
     */
    class MockTaskService {
      private tasks: Map<string, Task> = new Map();

      createTask(courseId: string, description: string, deadline: Date): Task {
        const task: Task = {
          id: `task-${Date.now()}-${Math.random()}`,
          courseId,
          description,
          deadline,
          completed: false,
          createdAt: new Date()
        };
        this.tasks.set(task.id, task);
        return task;
      }

      getTasksByCourse(courseId: string): Task[] {
        return Array.from(this.tasks.values()).filter(task => task.courseId === courseId);
      }

      getAllTasks(): Task[] {
        return Array.from(this.tasks.values());
      }

      clear(): void {
        this.tasks.clear();
      }
    }

    it('should accurately count tasks for each course', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
              department: fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
              taskCount: fc.nat({ max: 10 })
            }),
            { minLength: 1, maxLength: 10 }
          ).filter((courses) => {
            // Ensure all courses have unique (name, department) pairs
            const seen = new Set<string>();
            for (const course of courses) {
              const key = `${course.name.trim()}:${course.department.trim()}`;
              if (seen.has(key)) return false;
              seen.add(key);
            }
            return true;
          }),
          (coursesData) => {
            // Reset services for each test
            storage.clear();
            const freshStorageService = new StorageService(storage);
            const freshCourseService = new CourseService(freshStorageService);
            const mockTaskService = new MockTaskService();

            // Create courses and their tasks
            const courseTaskCounts = new Map<string, number>();
            
            for (const courseData of coursesData) {
              // Create course
              const createResult = freshCourseService.createCourse(courseData.name, courseData.department);
              expect(createResult.success).toBe(true);
              
              if (!createResult.success) continue;
              
              const course = createResult.value;
              
              // Create tasks for this course
              for (let i = 0; i < courseData.taskCount; i++) {
                const deadline = new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000);
                mockTaskService.createTask(
                  course.id,
                  `Task ${i + 1} for ${course.name}`,
                  deadline
                );
              }
              
              courseTaskCounts.set(course.id, courseData.taskCount);
            }

            // Get all courses
            const allCourses = freshCourseService.getAllCourses();
            expect(allCourses.length).toBe(coursesData.length);

            // Verify task count for each course is accurate
            for (const course of allCourses) {
              const tasksForCourse = mockTaskService.getTasksByCourse(course.id);
              const expectedCount = courseTaskCounts.get(course.id) || 0;
              
              // The actual task count should match the expected count
              expect(tasksForCourse.length).toBe(expectedCount);
              
              // All tasks should belong to this course
              for (const task of tasksForCourse) {
                expect(task.courseId).toBe(course.id);
              }
            }

            // Verify total task count across all courses
            const totalExpectedTasks = Array.from(courseTaskCounts.values()).reduce((sum, count) => sum + count, 0);
            const totalActualTasks = mockTaskService.getAllTasks().length;
            expect(totalActualTasks).toBe(totalExpectedTasks);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle courses with zero tasks', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
              department: fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0)
            }),
            { minLength: 1, maxLength: 5 }
          ).filter((courses) => {
            // Ensure all courses have unique (name, department) pairs
            const seen = new Set<string>();
            for (const course of courses) {
              const key = `${course.name.trim()}:${course.department.trim()}`;
              if (seen.has(key)) return false;
              seen.add(key);
            }
            return true;
          }),
          (coursesData) => {
            // Reset services for each test
            storage.clear();
            const freshStorageService = new StorageService(storage);
            const freshCourseService = new CourseService(freshStorageService);
            const mockTaskService = new MockTaskService();

            // Create courses without any tasks
            for (const courseData of coursesData) {
              const createResult = freshCourseService.createCourse(courseData.name, courseData.department);
              expect(createResult.success).toBe(true);
            }

            // Get all courses
            const allCourses = freshCourseService.getAllCourses();
            expect(allCourses.length).toBe(coursesData.length);

            // Verify each course has zero tasks
            for (const course of allCourses) {
              const tasksForCourse = mockTaskService.getTasksByCourse(course.id);
              expect(tasksForCourse.length).toBe(0);
            }

            // Verify total task count is zero
            expect(mockTaskService.getAllTasks().length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain accurate counts when tasks are distributed across courses', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }),
          fc.integer({ min: 1, max: 20 }),
          (numCourses: number, totalTasks: number) => {
            // Reset services for each test
            storage.clear();
            const freshStorageService = new StorageService(storage);
            const freshCourseService = new CourseService(freshStorageService);
            const mockTaskService = new MockTaskService();

            // Create courses
            const courses: Course[] = [];
            for (let i = 0; i < numCourses; i++) {
              const createResult = freshCourseService.createCourse(
                `Course ${i}`,
                `Department ${i % 3}`
              );
              expect(createResult.success).toBe(true);
              if (createResult.success) {
                courses.push(createResult.value);
              }
            }

            // Distribute tasks across courses
            for (let i = 0; i < totalTasks; i++) {
              const courseIndex = i % courses.length;
              const course = courses[courseIndex];
              const deadline = new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000);
              mockTaskService.createTask(
                course.id,
                `Task ${i}`,
                deadline
              );
            }

            // Count expected tasks per course
            const expectedCounts = new Map<string, number>();
            for (let i = 0; i < totalTasks; i++) {
              const courseIndex = i % courses.length;
              const courseId = courses[courseIndex].id;
              expectedCounts.set(courseId, (expectedCounts.get(courseId) || 0) + 1);
            }

            // Verify task counts for each course
            for (const course of courses) {
              const tasksForCourse = mockTaskService.getTasksByCourse(course.id);
              const expectedCount = expectedCounts.get(course.id) || 0;
              expect(tasksForCourse.length).toBe(expectedCount);
            }

            // Verify total task count
            expect(mockTaskService.getAllTasks().length).toBe(totalTasks);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly count tasks when courses are grouped by department', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              department: fc.constantFrom('CS', 'Math', 'Physics'),
              courses: fc.array(
                fc.record({
                  name: fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
                  taskCount: fc.nat({ max: 5 })
                }),
                { minLength: 1, maxLength: 3 }
              ).filter((courses) => {
                // Ensure unique course names within department
                const names = new Set(courses.map(c => c.name.trim()));
                return names.size === courses.length;
              })
            }),
            { minLength: 1, maxLength: 3 }
          ),
          (departmentsData) => {
            // Reset services for each test
            storage.clear();
            const freshStorageService = new StorageService(storage);
            const freshCourseService = new CourseService(freshStorageService);
            const mockTaskService = new MockTaskService();

            const courseTaskCounts = new Map<string, number>();

            // Create courses and tasks for each department
            for (const deptData of departmentsData) {
              for (const courseData of deptData.courses) {
                // Create course
                const createResult = freshCourseService.createCourse(
                  courseData.name,
                  deptData.department
                );
                expect(createResult.success).toBe(true);
                
                if (!createResult.success) continue;
                
                const course = createResult.value;
                
                // Create tasks
                for (let i = 0; i < courseData.taskCount; i++) {
                  const deadline = new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000);
                  mockTaskService.createTask(
                    course.id,
                    `Task ${i + 1}`,
                    deadline
                  );
                }
                
                courseTaskCounts.set(course.id, courseData.taskCount);
              }
            }

            // Get courses grouped by department
            const groupedCourses = freshCourseService.getCoursesByDepartment();

            // Verify task counts for each course in each department
            for (const [department, departmentCourses] of groupedCourses.entries()) {
              for (const course of departmentCourses) {
                const tasksForCourse = mockTaskService.getTasksByCourse(course.id);
                const expectedCount = courseTaskCounts.get(course.id) || 0;
                expect(tasksForCourse.length).toBe(expectedCount);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Tests for cascade deletion and task reassignment
   * **Validates: Requirements 7.2, 7.3**
   */
  describe('Cascade deletion and task reassignment', () => {
    let taskService: TaskService;

    beforeEach(() => {
      storage = new MockStorage();
      storageService = new StorageService(storage);
      taskService = new TaskService(storageService);
      courseService = new CourseService(storageService, taskService);
    });

    describe('hasAssociatedTasks', () => {
      it('should return true when course has tasks', () => {
        // Create a course
        const courseResult = courseService.createCourse('CS101', 'Computer Science');
        expect(courseResult.success).toBe(true);
        if (!courseResult.success) return;
        
        const course = courseResult.value;

        // Create a task for the course
        const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const taskResult = taskService.createTask(course.id, 'Assignment 1', deadline);
        expect(taskResult.success).toBe(true);

        // Check if course has associated tasks
        expect(courseService.hasAssociatedTasks(course.id)).toBe(true);
      });

      it('should return false when course has no tasks', () => {
        // Create a course
        const courseResult = courseService.createCourse('CS101', 'Computer Science');
        expect(courseResult.success).toBe(true);
        if (!courseResult.success) return;
        
        const course = courseResult.value;

        // Check if course has associated tasks
        expect(courseService.hasAssociatedTasks(course.id)).toBe(false);
      });

      it('should return false when task service is not available', () => {
        // Create a course service without task service
        const standaloneCourseService = new CourseService(storageService);
        const courseResult = standaloneCourseService.createCourse('CS101', 'Computer Science');
        expect(courseResult.success).toBe(true);
        if (!courseResult.success) return;
        
        const course = courseResult.value;

        // Should return false since no task service is available
        expect(standaloneCourseService.hasAssociatedTasks(course.id)).toBe(false);
      });
    });

    describe('deleteCourseWithTasks - cascade strategy', () => {
      it('should delete course and all associated tasks with cascade strategy', () => {
        // Create a course
        const courseResult = courseService.createCourse('CS101', 'Computer Science');
        expect(courseResult.success).toBe(true);
        if (!courseResult.success) return;
        
        const course = courseResult.value;

        // Create multiple tasks for the course
        const task1Result = taskService.createTask(
          course.id, 
          'Assignment 1', 
          new Date(Date.now() + 24 * 60 * 60 * 1000)
        );
        const task2Result = taskService.createTask(
          course.id, 
          'Assignment 2', 
          new Date(Date.now() + 48 * 60 * 60 * 1000)
        );
        const task3Result = taskService.createTask(
          course.id, 
          'Assignment 3', 
          new Date(Date.now() + 72 * 60 * 60 * 1000)
        );

        expect(task1Result.success).toBe(true);
        expect(task2Result.success).toBe(true);
        expect(task3Result.success).toBe(true);

        if (!task1Result.success || !task2Result.success || !task3Result.success) return;

        const task1 = task1Result.value;
        const task2 = task2Result.value;
        const task3 = task3Result.value;

        // Verify tasks exist
        expect(taskService.getTask(task1.id)).not.toBeNull();
        expect(taskService.getTask(task2.id)).not.toBeNull();
        expect(taskService.getTask(task3.id)).not.toBeNull();

        // Delete course with cascade strategy
        const deleteResult = courseService.deleteCourseWithTasks(course.id, 'cascade');
        expect(deleteResult.success).toBe(true);

        // Verify course is deleted
        expect(courseService.getCourse(course.id)).toBeNull();

        // Verify all tasks are deleted
        expect(taskService.getTask(task1.id)).toBeNull();
        expect(taskService.getTask(task2.id)).toBeNull();
        expect(taskService.getTask(task3.id)).toBeNull();

        // Verify no tasks remain for the course
        expect(taskService.getTasksByCourse(course.id).length).toBe(0);
      });

      it('should handle cascade deletion with no tasks', () => {
        // Create a course without tasks
        const courseResult = courseService.createCourse('CS101', 'Computer Science');
        expect(courseResult.success).toBe(true);
        if (!courseResult.success) return;
        
        const course = courseResult.value;

        // Delete course with cascade strategy
        const deleteResult = courseService.deleteCourseWithTasks(course.id, 'cascade');
        expect(deleteResult.success).toBe(true);

        // Verify course is deleted
        expect(courseService.getCourse(course.id)).toBeNull();
      });

      it('should not affect tasks from other courses', () => {
        // Create two courses
        const course1Result = courseService.createCourse('CS101', 'Computer Science');
        const course2Result = courseService.createCourse('CS102', 'Computer Science');
        
        expect(course1Result.success).toBe(true);
        expect(course2Result.success).toBe(true);
        
        if (!course1Result.success || !course2Result.success) return;
        
        const course1 = course1Result.value;
        const course2 = course2Result.value;

        // Create tasks for both courses
        const task1Result = taskService.createTask(
          course1.id, 
          'Course 1 Task', 
          new Date(Date.now() + 24 * 60 * 60 * 1000)
        );
        const task2Result = taskService.createTask(
          course2.id, 
          'Course 2 Task', 
          new Date(Date.now() + 24 * 60 * 60 * 1000)
        );

        expect(task1Result.success).toBe(true);
        expect(task2Result.success).toBe(true);
        
        if (!task1Result.success || !task2Result.success) return;
        
        const task1 = task1Result.value;
        const task2 = task2Result.value;

        // Delete course1 with cascade
        const deleteResult = courseService.deleteCourseWithTasks(course1.id, 'cascade');
        expect(deleteResult.success).toBe(true);

        // Verify course1 and its task are deleted
        expect(courseService.getCourse(course1.id)).toBeNull();
        expect(taskService.getTask(task1.id)).toBeNull();

        // Verify course2 and its task still exist
        expect(courseService.getCourse(course2.id)).not.toBeNull();
        expect(taskService.getTask(task2.id)).not.toBeNull();
      });
    });

    describe('deleteCourseWithTasks - reassign strategy', () => {
      it('should delete course and reassign tasks to target course', () => {
        // Create two courses
        const course1Result = courseService.createCourse('CS101', 'Computer Science');
        const course2Result = courseService.createCourse('CS102', 'Computer Science');
        
        expect(course1Result.success).toBe(true);
        expect(course2Result.success).toBe(true);
        
        if (!course1Result.success || !course2Result.success) return;
        
        const course1 = course1Result.value;
        const course2 = course2Result.value;

        // Create tasks for course1
        const task1Result = taskService.createTask(
          course1.id, 
          'Assignment 1', 
          new Date(Date.now() + 24 * 60 * 60 * 1000)
        );
        const task2Result = taskService.createTask(
          course1.id, 
          'Assignment 2', 
          new Date(Date.now() + 48 * 60 * 60 * 1000)
        );

        expect(task1Result.success).toBe(true);
        expect(task2Result.success).toBe(true);
        
        if (!task1Result.success || !task2Result.success) return;
        
        const task1 = task1Result.value;
        const task2 = task2Result.value;

        // Verify tasks belong to course1
        expect(task1.courseId).toBe(course1.id);
        expect(task2.courseId).toBe(course1.id);

        // Delete course1 and reassign tasks to course2
        const deleteResult = courseService.deleteCourseWithTasks(
          course1.id, 
          'reassign', 
          course2.id
        );
        expect(deleteResult.success).toBe(true);

        // Verify course1 is deleted
        expect(courseService.getCourse(course1.id)).toBeNull();

        // Verify course2 still exists
        expect(courseService.getCourse(course2.id)).not.toBeNull();

        // Verify tasks still exist and are reassigned to course2
        const reassignedTask1 = taskService.getTask(task1.id);
        const reassignedTask2 = taskService.getTask(task2.id);
        
        expect(reassignedTask1).not.toBeNull();
        expect(reassignedTask2).not.toBeNull();
        
        expect(reassignedTask1?.courseId).toBe(course2.id);
        expect(reassignedTask2?.courseId).toBe(course2.id);

        // Verify course2 now has both tasks
        const course2Tasks = taskService.getTasksByCourse(course2.id);
        expect(course2Tasks.length).toBe(2);
      });

      it('should fail when target course ID is not provided', () => {
        // Create a course with tasks
        const courseResult = courseService.createCourse('CS101', 'Computer Science');
        expect(courseResult.success).toBe(true);
        if (!courseResult.success) return;
        
        const course = courseResult.value;

        const taskResult = taskService.createTask(
          course.id, 
          'Assignment 1', 
          new Date(Date.now() + 24 * 60 * 60 * 1000)
        );
        expect(taskResult.success).toBe(true);

        // Attempt to delete with reassign strategy but no target course
        const deleteResult = courseService.deleteCourseWithTasks(course.id, 'reassign');
        
        expect(deleteResult.success).toBe(false);
        if (!deleteResult.success) {
          expect(deleteResult.error).toBeInstanceOf(ValidationError);
          expect(deleteResult.error.message).toContain('Target course ID is required');
        }

        // Verify course still exists
        expect(courseService.getCourse(course.id)).not.toBeNull();
      });

      it('should fail when target course does not exist', () => {
        // Create a course with tasks
        const courseResult = courseService.createCourse('CS101', 'Computer Science');
        expect(courseResult.success).toBe(true);
        if (!courseResult.success) return;
        
        const course = courseResult.value;

        const taskResult = taskService.createTask(
          course.id, 
          'Assignment 1', 
          new Date(Date.now() + 24 * 60 * 60 * 1000)
        );
        expect(taskResult.success).toBe(true);

        // Attempt to delete with reassign to non-existent course
        const deleteResult = courseService.deleteCourseWithTasks(
          course.id, 
          'reassign', 
          'non-existent-id'
        );
        
        expect(deleteResult.success).toBe(false);
        if (!deleteResult.success) {
          expect(deleteResult.error).toBeInstanceOf(NotFoundError);
          expect(deleteResult.error.message).toContain('Target course');
          expect(deleteResult.error.message).toContain('not found');
        }

        // Verify course still exists
        expect(courseService.getCourse(course.id)).not.toBeNull();
      });

      it('should fail when target course is the same as the course being deleted', () => {
        // Create a course with tasks
        const courseResult = courseService.createCourse('CS101', 'Computer Science');
        expect(courseResult.success).toBe(true);
        if (!courseResult.success) return;
        
        const course = courseResult.value;

        const taskResult = taskService.createTask(
          course.id, 
          'Assignment 1', 
          new Date(Date.now() + 24 * 60 * 60 * 1000)
        );
        expect(taskResult.success).toBe(true);

        // Attempt to delete with reassign to itself
        const deleteResult = courseService.deleteCourseWithTasks(
          course.id, 
          'reassign', 
          course.id
        );
        
        expect(deleteResult.success).toBe(false);
        if (!deleteResult.success) {
          expect(deleteResult.error).toBeInstanceOf(ValidationError);
          expect(deleteResult.error.message).toContain('Cannot reassign tasks to the course being deleted');
        }

        // Verify course still exists
        expect(courseService.getCourse(course.id)).not.toBeNull();
      });

      it('should handle reassignment with no tasks', () => {
        // Create two courses
        const course1Result = courseService.createCourse('CS101', 'Computer Science');
        const course2Result = courseService.createCourse('CS102', 'Computer Science');
        
        expect(course1Result.success).toBe(true);
        expect(course2Result.success).toBe(true);
        
        if (!course1Result.success || !course2Result.success) return;
        
        const course1 = course1Result.value;
        const course2 = course2Result.value;

        // Delete course1 with reassign strategy (but no tasks to reassign)
        const deleteResult = courseService.deleteCourseWithTasks(
          course1.id, 
          'reassign', 
          course2.id
        );
        expect(deleteResult.success).toBe(true);

        // Verify course1 is deleted
        expect(courseService.getCourse(course1.id)).toBeNull();

        // Verify course2 still exists
        expect(courseService.getCourse(course2.id)).not.toBeNull();
      });
    });

    describe('deleteCourseWithTasks - error handling', () => {
      it('should fail when course does not exist', () => {
        const deleteResult = courseService.deleteCourseWithTasks(
          'non-existent-id', 
          'cascade'
        );
        
        expect(deleteResult.success).toBe(false);
        if (!deleteResult.success) {
          expect(deleteResult.error).toBeInstanceOf(NotFoundError);
          expect(deleteResult.error.message).toContain('not found');
        }
      });

      it('should work without task service', () => {
        // Create a course service without task service
        const standaloneCourseService = new CourseService(storageService);
        const courseResult = standaloneCourseService.createCourse('CS101', 'Computer Science');
        expect(courseResult.success).toBe(true);
        if (!courseResult.success) return;
        
        const course = courseResult.value;

        // Delete with cascade (should just delete the course)
        const deleteResult = standaloneCourseService.deleteCourseWithTasks(
          course.id, 
          'cascade'
        );
        expect(deleteResult.success).toBe(true);

        // Verify course is deleted
        expect(standaloneCourseService.getCourse(course.id)).toBeNull();
      });
    });

    /**
     * **Feature: weekly-course-tracker, Property 20: Cascade deletion or reassignment**
     * **Validates: Requirements 7.3**
     * 
     * For any course with associated tasks, deleting the course should either delete 
     * all associated tasks (cascade) or handle them according to the specified strategy, 
     * with no orphaned tasks remaining.
     */
    describe('Property 20: Cascade deletion or reassignment', () => {
      it('should ensure no orphaned tasks remain after cascade deletion', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
            fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
            fc.array(
              fc.record({
                description: fc.string({ minLength: 1, maxLength: 200 }).filter((s: string) => s.trim().length > 0),
                daysFromNow: fc.integer({ min: 1, max: 365 })
              }),
              { minLength: 1, maxLength: 10 }
            ),
            (courseName: string, department: string, tasksData) => {
              // Reset services for each test
              storage.clear();
              const freshStorageService = new StorageService(storage);
              const freshTaskService = new TaskService(freshStorageService);
              const freshCourseService = new CourseService(freshStorageService, freshTaskService);

              // Create a course
              const courseResult = freshCourseService.createCourse(courseName, department);
              expect(courseResult.success).toBe(true);
              if (!courseResult.success) return;
              
              const course = courseResult.value;

              // Create tasks for the course
              const taskIds: string[] = [];
              for (const taskData of tasksData) {
                const deadline = new Date(Date.now() + taskData.daysFromNow * 24 * 60 * 60 * 1000);
                const taskResult = freshTaskService.createTask(course.id, taskData.description, deadline);
                expect(taskResult.success).toBe(true);
                if (taskResult.success) {
                  taskIds.push(taskResult.value.id);
                }
              }

              // Verify tasks exist before deletion
              expect(freshTaskService.getTasksByCourse(course.id).length).toBe(taskIds.length);

              // Delete course with cascade strategy
              const deleteResult = freshCourseService.deleteCourseWithTasks(course.id, 'cascade');
              expect(deleteResult.success).toBe(true);

              // Verify course is deleted
              expect(freshCourseService.getCourse(course.id)).toBeNull();

              // Verify all tasks are deleted (no orphaned tasks)
              for (const taskId of taskIds) {
                expect(freshTaskService.getTask(taskId)).toBeNull();
              }

              // Verify no tasks remain for the deleted course
              expect(freshTaskService.getTasksByCourse(course.id).length).toBe(0);

              // Verify total task count is zero
              expect(freshTaskService.getAllTasks().length).toBe(0);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should ensure no orphaned tasks remain after reassignment', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
            fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
            fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
            fc.array(
              fc.record({
                description: fc.string({ minLength: 1, maxLength: 200 }).filter((s: string) => s.trim().length > 0),
                daysFromNow: fc.integer({ min: 1, max: 365 })
              }),
              { minLength: 1, maxLength: 10 }
            ),
            (course1Name: string, course2Name: string, department: string, tasksData) => {
              // Skip if course names are the same
              if (course1Name.trim() === course2Name.trim()) {
                return;
              }

              // Reset services for each test
              storage.clear();
              const freshStorageService = new StorageService(storage);
              const freshTaskService = new TaskService(freshStorageService);
              const freshCourseService = new CourseService(freshStorageService, freshTaskService);

              // Create two courses
              const course1Result = freshCourseService.createCourse(course1Name, department);
              const course2Result = freshCourseService.createCourse(course2Name, department);
              
              expect(course1Result.success).toBe(true);
              expect(course2Result.success).toBe(true);
              
              if (!course1Result.success || !course2Result.success) return;
              
              const course1 = course1Result.value;
              const course2 = course2Result.value;

              // Create tasks for course1
              const taskIds: string[] = [];
              for (const taskData of tasksData) {
                const deadline = new Date(Date.now() + taskData.daysFromNow * 24 * 60 * 60 * 1000);
                const taskResult = freshTaskService.createTask(course1.id, taskData.description, deadline);
                expect(taskResult.success).toBe(true);
                if (taskResult.success) {
                  taskIds.push(taskResult.value.id);
                }
              }

              // Verify tasks exist before deletion
              expect(freshTaskService.getTasksByCourse(course1.id).length).toBe(taskIds.length);

              // Delete course1 with reassignment to course2
              const deleteResult = freshCourseService.deleteCourseWithTasks(
                course1.id, 
                'reassign', 
                course2.id
              );
              expect(deleteResult.success).toBe(true);

              // Verify course1 is deleted
              expect(freshCourseService.getCourse(course1.id)).toBeNull();

              // Verify course2 still exists
              expect(freshCourseService.getCourse(course2.id)).not.toBeNull();

              // Verify all tasks still exist (not orphaned)
              for (const taskId of taskIds) {
                const task = freshTaskService.getTask(taskId);
                expect(task).not.toBeNull();
                
                // Verify task is reassigned to course2
                expect(task?.courseId).toBe(course2.id);
              }

              // Verify no tasks remain for course1
              expect(freshTaskService.getTasksByCourse(course1.id).length).toBe(0);

              // Verify all tasks are now associated with course2
              expect(freshTaskService.getTasksByCourse(course2.id).length).toBe(taskIds.length);

              // Verify total task count matches
              expect(freshTaskService.getAllTasks().length).toBe(taskIds.length);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should handle deletion with no tasks gracefully', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
            fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
            fc.constantFrom('cascade', 'reassign'),
            (courseName: string, department: string, strategy: 'cascade' | 'reassign') => {
              // Reset services for each test
              storage.clear();
              const freshStorageService = new StorageService(storage);
              const freshTaskService = new TaskService(freshStorageService);
              const freshCourseService = new CourseService(freshStorageService, freshTaskService);

              // Create a course without tasks
              const courseResult = freshCourseService.createCourse(courseName, department);
              expect(courseResult.success).toBe(true);
              if (!courseResult.success) return;
              
              const course = courseResult.value;

              // Verify no tasks exist
              expect(freshTaskService.getTasksByCourse(course.id).length).toBe(0);

              // Delete course with specified strategy
              let deleteResult;
              if (strategy === 'reassign') {
                // Create a target course for reassignment
                const targetResult = freshCourseService.createCourse('Target Course', department);
                expect(targetResult.success).toBe(true);
                if (!targetResult.success) return;
                
                deleteResult = freshCourseService.deleteCourseWithTasks(
                  course.id, 
                  strategy, 
                  targetResult.value.id
                );
              } else {
                deleteResult = freshCourseService.deleteCourseWithTasks(course.id, strategy);
              }

              // Should succeed
              expect(deleteResult.success).toBe(true);

              // Verify course is deleted
              expect(freshCourseService.getCourse(course.id)).toBeNull();

              // Verify no orphaned tasks
              expect(freshTaskService.getTasksByCourse(course.id).length).toBe(0);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should maintain referential integrity across multiple courses', () => {
        fc.assert(
          fc.property(
            fc.array(
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
                department: fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
                taskCount: fc.integer({ min: 0, max: 5 })
              }),
              { minLength: 2, maxLength: 5 }
            ).filter((courses) => {
              // Ensure all courses have unique (name, department) pairs
              const seen = new Set<string>();
              for (const course of courses) {
                const key = `${course.name.trim()}:${course.department.trim()}`;
                if (seen.has(key)) return false;
                seen.add(key);
              }
              return true;
            }),
            fc.nat(),
            (coursesData, deleteIndexSeed) => {
              // Reset services for each test
              storage.clear();
              const freshStorageService = new StorageService(storage);
              const freshTaskService = new TaskService(freshStorageService);
              const freshCourseService = new CourseService(freshStorageService, freshTaskService);

              // Create courses and their tasks
              const courses: Array<{ id: string; taskIds: string[] }> = [];
              
              for (const courseData of coursesData) {
                const courseResult = freshCourseService.createCourse(courseData.name, courseData.department);
                expect(courseResult.success).toBe(true);
                if (!courseResult.success) continue;
                
                const course = courseResult.value;
                const taskIds: string[] = [];
                
                // Create tasks for this course
                for (let i = 0; i < courseData.taskCount; i++) {
                  const deadline = new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000);
                  const taskResult = freshTaskService.createTask(
                    course.id,
                    `Task ${i + 1}`,
                    deadline
                  );
                  expect(taskResult.success).toBe(true);
                  if (taskResult.success) {
                    taskIds.push(taskResult.value.id);
                  }
                }
                
                courses.push({ id: course.id, taskIds });
              }

              // Select a course to delete
              const deleteIndex = deleteIndexSeed % courses.length;
              const courseToDelete = courses[deleteIndex];
              const remainingCourses = courses.filter((_, i) => i !== deleteIndex);

              // Count total tasks before deletion
              const totalTasksBefore = courses.reduce((sum, c) => sum + c.taskIds.length, 0);

              // Delete the selected course with cascade
              const deleteResult = freshCourseService.deleteCourseWithTasks(
                courseToDelete.id, 
                'cascade'
              );
              expect(deleteResult.success).toBe(true);

              // Verify the deleted course is gone
              expect(freshCourseService.getCourse(courseToDelete.id)).toBeNull();

              // Verify all tasks from deleted course are gone
              for (const taskId of courseToDelete.taskIds) {
                expect(freshTaskService.getTask(taskId)).toBeNull();
              }

              // Verify remaining courses and their tasks are intact
              for (const course of remainingCourses) {
                expect(freshCourseService.getCourse(course.id)).not.toBeNull();
                
                for (const taskId of course.taskIds) {
                  const task = freshTaskService.getTask(taskId);
                  expect(task).not.toBeNull();
                  expect(task?.courseId).toBe(course.id);
                }
              }

              // Verify total task count is correct
              const expectedTasksAfter = totalTasksBefore - courseToDelete.taskIds.length;
              expect(freshTaskService.getAllTasks().length).toBe(expectedTasksAfter);

              // Verify no orphaned tasks exist
              const allTasks = freshTaskService.getAllTasks();
              for (const task of allTasks) {
                // Each task should belong to an existing course
                expect(freshCourseService.getCourse(task.courseId)).not.toBeNull();
              }
            }
          ),
          { numRuns: 100 }
        );
      });
    });
  });
});
