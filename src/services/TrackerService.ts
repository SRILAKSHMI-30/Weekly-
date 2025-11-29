/**
 * TrackerService is the main application coordinator
 * Initializes and manages all services, providing a unified API for the UI layer
 */

import { Course, Task, WeeklyStatistics, DepartmentStats, CourseStats, Result } from '../models/types.js';
import { ValidationError } from '../models/errors.js';
import { StorageService, IStorageService } from '../storage/StorageService.js';
import { CourseService, ICourseService, DeletionStrategy } from './CourseService.js';
import { TaskService, ITaskService } from './TaskService.js';
import { StatisticsService, IStatisticsService } from './StatisticsService.js';

/**
 * TrackerService interface - unified API for the application
 */
export interface ITrackerService {
  // Initialization
  initialize(): void;
  
  // Course operations
  createCourse(name: string, department: string): Result<Course, ValidationError>;
  getCourse(id: string): Course | null;
  getAllCourses(): Course[];
  getCoursesByDepartment(): Map<string, Course[]>;
  updateCourse(id: string, updates: Partial<Course>): Result<Course, ValidationError>;
  deleteCourse(id: string, strategy?: DeletionStrategy, targetCourseId?: string): Result<void, Error>;
  courseExists(name: string, department: string): boolean;
  hasAssociatedTasks(courseId: string): boolean;
  
  // Task operations
  createTask(courseId: string, description: string, deadline: Date): Result<Task, ValidationError>;
  getTask(id: string): Task | null;
  getAllTasks(): Task[];
  getTasksByCourse(courseId: string): Task[];
  getTasksForWeek(weekNumber: number, year: number): Task[];
  updateTask(id: string, updates: Partial<Task>): Result<Task, ValidationError>;
  deleteTask(id: string): Result<void, Error>;
  markTaskComplete(id: string): Result<Task, Error>;
  markTaskIncomplete(id: string): Result<Task, Error>;
  getOverdueTasks(): Task[];
  
  // Statistics operations
  getWeeklyStatistics(weekNumber: number, year: number): WeeklyStatistics;
  getCourseProgress(courseId: string): CourseStats | null;
  getDepartmentProgress(department: string): DepartmentStats;
}

/**
 * TrackerService implementation
 */
export class TrackerService implements ITrackerService {
  private storageService: IStorageService;
  private courseService: ICourseService;
  private taskService: ITaskService;
  private statisticsService: IStatisticsService;
  private initialized: boolean = false;

  constructor(storage?: Storage) {
    // Initialize storage service
    this.storageService = new StorageService(storage);
    
    // Initialize task service first (no dependencies)
    this.taskService = new TaskService(this.storageService);
    
    // Initialize course service with task service reference for cascade operations
    this.courseService = new CourseService(this.storageService, this.taskService);
    
    // Initialize statistics service with both task and course services
    this.statisticsService = new StatisticsService(this.taskService, this.courseService);
  }

  /**
   * Initialize the application and load data from storage
   */
  initialize(): void {
    if (this.initialized) {
      return;
    }
    
    // Services automatically load their data in constructors
    // This method is provided for explicit initialization if needed
    this.initialized = true;
  }

  // ==================== Course Operations ====================

  /**
   * Create a new course
   */
  createCourse(name: string, department: string): Result<Course, ValidationError> {
    return this.courseService.createCourse(name, department);
  }

  /**
   * Get a course by ID
   */
  getCourse(id: string): Course | null {
    return this.courseService.getCourse(id);
  }

  /**
   * Get all courses
   */
  getAllCourses(): Course[] {
    return this.courseService.getAllCourses();
  }

  /**
   * Get courses grouped by department
   */
  getCoursesByDepartment(): Map<string, Course[]> {
    return this.courseService.getCoursesByDepartment();
  }

  /**
   * Update a course
   */
  updateCourse(id: string, updates: Partial<Course>): Result<Course, ValidationError> {
    return this.courseService.updateCourse(id, updates);
  }

  /**
   * Delete a course with optional strategy for handling associated tasks
   * @param id - Course ID to delete
   * @param strategy - Optional deletion strategy: 'cascade' or 'reassign'
   * @param targetCourseId - Required when strategy is 'reassign'
   */
  deleteCourse(id: string, strategy?: DeletionStrategy, targetCourseId?: string): Result<void, Error> {
    // Check if course has associated tasks
    const hasAssociatedTasks = this.courseService.hasAssociatedTasks(id);
    
    if (hasAssociatedTasks && strategy) {
      // Use the specified strategy for handling tasks
      return this.courseService.deleteCourseWithTasks(id, strategy, targetCourseId);
    } else if (hasAssociatedTasks && !strategy) {
      // If course has tasks but no strategy specified, return error
      return {
        success: false,
        error: new ValidationError(
          'Cannot delete course with associated tasks. Please specify a deletion strategy (cascade or reassign).'
        )
      };
    } else {
      // No associated tasks, simple delete
      return this.courseService.deleteCourse(id);
    }
  }

  /**
   * Check if a course exists with the given name and department
   */
  courseExists(name: string, department: string): boolean {
    return this.courseService.courseExists(name, department);
  }

  /**
   * Check if a course has associated tasks
   */
  hasAssociatedTasks(courseId: string): boolean {
    return this.courseService.hasAssociatedTasks(courseId);
  }

  // ==================== Task Operations ====================

  /**
   * Create a new task
   */
  createTask(courseId: string, description: string, deadline: Date): Result<Task, ValidationError> {
    // Validate that the course exists
    const course = this.courseService.getCourse(courseId);
    if (!course) {
      return {
        success: false,
        error: new ValidationError(`Course with ID "${courseId}" not found`)
      };
    }
    
    return this.taskService.createTask(courseId, description, deadline);
  }

  /**
   * Get a task by ID
   */
  getTask(id: string): Task | null {
    return this.taskService.getTask(id);
  }

  /**
   * Get all tasks
   */
  getAllTasks(): Task[] {
    return this.taskService.getAllTasks();
  }

  /**
   * Get all tasks for a specific course
   */
  getTasksByCourse(courseId: string): Task[] {
    return this.taskService.getTasksByCourse(courseId);
  }

  /**
   * Get all tasks for a specific week
   */
  getTasksForWeek(weekNumber: number, year: number): Task[] {
    return this.taskService.getTasksForWeek(weekNumber, year);
  }

  /**
   * Update a task
   */
  updateTask(id: string, updates: Partial<Task>): Result<Task, ValidationError> {
    // If courseId is being updated, validate that the new course exists
    if (updates.courseId) {
      const course = this.courseService.getCourse(updates.courseId);
      if (!course) {
        return {
          success: false,
          error: new ValidationError(`Course with ID "${updates.courseId}" not found`)
        };
      }
    }
    
    return this.taskService.updateTask(id, updates);
  }

  /**
   * Delete a task
   */
  deleteTask(id: string): Result<void, Error> {
    return this.taskService.deleteTask(id);
  }

  /**
   * Mark a task as complete
   */
  markTaskComplete(id: string): Result<Task, Error> {
    return this.taskService.markComplete(id);
  }

  /**
   * Mark a task as incomplete
   */
  markTaskIncomplete(id: string): Result<Task, Error> {
    return this.taskService.markIncomplete(id);
  }

  /**
   * Get all overdue tasks
   */
  getOverdueTasks(): Task[] {
    return this.taskService.getOverdueTasks();
  }

  // ==================== Statistics Operations ====================

  /**
   * Get comprehensive statistics for a specific week
   */
  getWeeklyStatistics(weekNumber: number, year: number): WeeklyStatistics {
    return this.statisticsService.getWeeklyStatistics(weekNumber, year);
  }

  /**
   * Get progress statistics for a specific course
   */
  getCourseProgress(courseId: string): CourseStats | null {
    return this.statisticsService.getCourseProgress(courseId);
  }

  /**
   * Get progress statistics for a specific department
   */
  getDepartmentProgress(department: string): DepartmentStats {
    return this.statisticsService.getDepartmentProgress(department);
  }
}
