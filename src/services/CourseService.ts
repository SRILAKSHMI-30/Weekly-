/**
 * CourseService provides CRUD operations for courses
 * Handles validation, duplicate checking, and persistence
 */

import { Course, Result } from '../models/types.js';
import { ValidationError, NotFoundError } from '../models/errors.js';
import { IStorageService } from '../storage/StorageService.js';
import { validateNonEmptyString } from '../utils/validation.js';
import { generateUUID } from '../utils/uuid.js';

const COURSES_STORAGE_KEY = 'tracker:courses';

/**
 * Deletion strategy for courses with associated tasks
 */
export type DeletionStrategy = 'cascade' | 'reassign';

/**
 * CourseService interface
 */
export interface ICourseService {
  createCourse(name: string, department: string): Result<Course, ValidationError>;
  getCourse(id: string): Course | null;
  getAllCourses(): Course[];
  getCoursesByDepartment(): Map<string, Course[]>;
  updateCourse(id: string, updates: Partial<Course>): Result<Course, ValidationError>;
  deleteCourse(id: string): Result<void, Error>;
  deleteCourseWithTasks(
    id: string, 
    strategy: DeletionStrategy, 
    targetCourseId?: string
  ): Result<void, Error>;
  courseExists(name: string, department: string): boolean;
  hasAssociatedTasks(id: string): boolean;
}

/**
 * CourseService implementation
 */
export class CourseService implements ICourseService {
  private storage: IStorageService;
  private courses: Map<string, Course>;
  private taskService?: { 
    getTasksByCourse(courseId: string): any[]; 
    deleteTask(id: string): Result<void, Error>;
    updateTask(id: string, updates: any): Result<any, ValidationError>;
  };

  constructor(storage: IStorageService, taskService?: { 
    getTasksByCourse(courseId: string): any[]; 
    deleteTask(id: string): Result<void, Error>;
    updateTask(id: string, updates: any): Result<any, ValidationError>;
  }) {
    this.storage = storage;
    this.taskService = taskService;
    this.courses = new Map();
    this.loadCourses();
  }

  /**
   * Load courses from storage into memory
   */
  private loadCourses(): void {
    const result = this.storage.load<Course[]>(COURSES_STORAGE_KEY);
    if (result.success) {
      this.courses = new Map(result.value.map(course => [course.id, course]));
    } else {
      // Initialize with empty map if no data exists
      this.courses = new Map();
    }
  }

  /**
   * Save courses to storage
   */
  private saveCourses(): Result<void, Error> {
    const coursesArray = Array.from(this.courses.values());
    const result = this.storage.save(COURSES_STORAGE_KEY, coursesArray);
    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true, value: undefined };
  }

  /**
   * Create a new course with validation and duplicate checking
   */
  createCourse(name: string, department: string): Result<Course, ValidationError> {
    // Validate course name
    const validatedName = validateNonEmptyString(name);
    if (validatedName === null) {
      return {
        success: false,
        error: new ValidationError('Course name cannot be empty or whitespace only')
      };
    }

    // Validate department
    const validatedDepartment = validateNonEmptyString(department);
    if (validatedDepartment === null) {
      return {
        success: false,
        error: new ValidationError('Department cannot be empty or whitespace only')
      };
    }

    // Check for duplicate
    if (this.courseExists(validatedName, validatedDepartment)) {
      return {
        success: false,
        error: new ValidationError(
          `Course "${validatedName}" already exists in department "${validatedDepartment}"`
        )
      };
    }

    // Create course
    const course: Course = {
      id: generateUUID(),
      name: validatedName,
      department: validatedDepartment,
      createdAt: new Date()
    };

    // Add to memory
    this.courses.set(course.id, course);

    // Save to storage
    const saveResult = this.saveCourses();
    if (!saveResult.success) {
      // Rollback in-memory change
      this.courses.delete(course.id);
      return {
        success: false,
        error: new ValidationError(`Failed to save course: ${saveResult.error.message}`)
      };
    }

    return { success: true, value: course };
  }

  /**
   * Get a course by ID
   */
  getCourse(id: string): Course | null {
    return this.courses.get(id) || null;
  }

  /**
   * Get all courses
   */
  getAllCourses(): Course[] {
    return Array.from(this.courses.values());
  }

  /**
   * Get courses grouped by department
   */
  getCoursesByDepartment(): Map<string, Course[]> {
    const grouped = new Map<string, Course[]>();
    
    for (const course of this.courses.values()) {
      const departmentCourses = grouped.get(course.department) || [];
      departmentCourses.push(course);
      grouped.set(course.department, departmentCourses);
    }
    
    return grouped;
  }

  /**
   * Update a course
   */
  updateCourse(id: string, updates: Partial<Course>): Result<Course, ValidationError> {
    // Check if course exists
    const existingCourse = this.courses.get(id);
    if (!existingCourse) {
      return {
        success: false,
        error: new ValidationError(`Course with ID "${id}" not found`)
      };
    }

    // Validate name if provided
    let validatedName = existingCourse.name;
    if (updates.name !== undefined) {
      const validated = validateNonEmptyString(updates.name);
      if (validated === null) {
        return {
          success: false,
          error: new ValidationError('Course name cannot be empty or whitespace only')
        };
      }
      validatedName = validated;
    }

    // Validate department if provided
    let validatedDepartment = existingCourse.department;
    if (updates.department !== undefined) {
      const validated = validateNonEmptyString(updates.department);
      if (validated === null) {
        return {
          success: false,
          error: new ValidationError('Department cannot be empty or whitespace only')
        };
      }
      validatedDepartment = validated;
    }

    // Check for duplicate if name or department changed
    if ((validatedName !== existingCourse.name || validatedDepartment !== existingCourse.department) &&
        this.courseExists(validatedName, validatedDepartment)) {
      return {
        success: false,
        error: new ValidationError(
          `Course "${validatedName}" already exists in department "${validatedDepartment}"`
        )
      };
    }

    // Create updated course
    const updatedCourse: Course = {
      ...existingCourse,
      name: validatedName,
      department: validatedDepartment
    };

    // Update in memory
    this.courses.set(id, updatedCourse);

    // Save to storage
    const saveResult = this.saveCourses();
    if (!saveResult.success) {
      // Rollback in-memory change
      this.courses.set(id, existingCourse);
      return {
        success: false,
        error: new ValidationError(`Failed to save course: ${saveResult.error.message}`)
      };
    }

    return { success: true, value: updatedCourse };
  }

  /**
   * Delete a course
   */
  deleteCourse(id: string): Result<void, Error> {
    // Check if course exists
    const existingCourse = this.courses.get(id);
    if (!existingCourse) {
      return {
        success: false,
        error: new NotFoundError(`Course with ID "${id}" not found`)
      };
    }

    // Delete from memory
    this.courses.delete(id);

    // Save to storage
    const saveResult = this.saveCourses();
    if (!saveResult.success) {
      // Rollback in-memory change
      this.courses.set(id, existingCourse);
      return {
        success: false,
        error: saveResult.error
      };
    }

    return { success: true, value: undefined };
  }

  /**
   * Check if a course has associated tasks
   */
  hasAssociatedTasks(id: string): boolean {
    if (!this.taskService) {
      return false;
    }
    
    const tasks = this.taskService.getTasksByCourse(id);
    return tasks.length > 0;
  }

  /**
   * Delete a course with associated tasks using a specified strategy
   * @param id - Course ID to delete
   * @param strategy - 'cascade' to delete all tasks, 'reassign' to move tasks to another course
   * @param targetCourseId - Required when strategy is 'reassign', the course to move tasks to
   */
  deleteCourseWithTasks(
    id: string, 
    strategy: DeletionStrategy, 
    targetCourseId?: string
  ): Result<void, Error> {
    // Check if course exists
    const existingCourse = this.courses.get(id);
    if (!existingCourse) {
      return {
        success: false,
        error: new NotFoundError(`Course with ID "${id}" not found`)
      };
    }

    // If no task service is available, just delete the course
    if (!this.taskService) {
      return this.deleteCourse(id);
    }

    // Get associated tasks
    const associatedTasks = this.taskService.getTasksByCourse(id);

    // Handle based on strategy
    if (strategy === 'cascade') {
      // Delete all associated tasks
      for (const task of associatedTasks) {
        const deleteResult = this.taskService.deleteTask(task.id);
        if (!deleteResult.success) {
          return {
            success: false,
            error: new Error(`Failed to delete task ${task.id}: ${deleteResult.error.message}`)
          };
        }
      }
    } else if (strategy === 'reassign') {
      // Validate target course ID is provided
      if (!targetCourseId) {
        return {
          success: false,
          error: new ValidationError('Target course ID is required for reassignment strategy')
        };
      }

      // Validate target course exists
      const targetCourse = this.courses.get(targetCourseId);
      if (!targetCourse) {
        return {
          success: false,
          error: new NotFoundError(`Target course with ID "${targetCourseId}" not found`)
        };
      }

      // Validate target course is not the same as the course being deleted
      if (targetCourseId === id) {
        return {
          success: false,
          error: new ValidationError('Cannot reassign tasks to the course being deleted')
        };
      }

      // Reassign all tasks to the target course
      for (const task of associatedTasks) {
        const updateResult = this.taskService.updateTask(task.id, { courseId: targetCourseId });
        if (!updateResult.success) {
          return {
            success: false,
            error: new Error(`Failed to reassign task ${task.id}: ${updateResult.error.message}`)
          };
        }
      }
    }

    // Delete the course
    return this.deleteCourse(id);
  }

  /**
   * Check if a course exists with the given name and department
   */
  courseExists(name: string, department: string): boolean {
    const normalizedName = name.trim();
    const normalizedDepartment = department.trim();
    
    for (const course of this.courses.values()) {
      if (course.name === normalizedName && course.department === normalizedDepartment) {
        return true;
      }
    }
    
    return false;
  }
}
