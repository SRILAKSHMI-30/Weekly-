/**
 * TrackerServiceAdapter - Adapts TrackerService to the async interface expected by UI components
 * This adapter wraps the synchronous TrackerService methods in Promises for UI compatibility
 */

import { Course, Task, WeeklyStatistics, Result } from '../models/types.js';
import { ValidationError } from '../models/errors.js';
import { TrackerService, ITrackerService } from './TrackerService.js';

/**
 * Async interface expected by UI components
 */
export interface TrackerServiceInterface {
  // Course operations
  createCourse(name: string, department: string): Promise<Result<Course, ValidationError>>;
  getCourse(id: string): Course | null;
  getAllCourses(): Course[];
  updateCourse(id: string, name: string, department: string): Promise<Result<Course, ValidationError>>;
  deleteCourse(id: string, strategy?: 'cascade' | 'cancel'): Promise<Result<void, Error>>;
  
  // Task operations
  createTask(courseId: string, description: string, deadline: Date): Promise<Result<Task, ValidationError>>;
  getTask(id: string): Task | null;
  getAllTasks(): Task[];
  getTasksForWeek(weekNumber: number, year: number): Task[];
  updateTask(id: string, description: string, deadline: Date): Promise<Result<Task, ValidationError>>;
  deleteTask(id: string): Promise<Result<void, Error>>;
  toggleTaskComplete(id: string, completed: boolean): Promise<Result<Task, Error>>;
  getOverdueTasks(): Task[];
  
  // Statistics operations
  getWeeklyStatistics(weekNumber: number, year: number): WeeklyStatistics;
  
  // Utility
  getTaskCountByCourse(): Map<string, number>;
  
  // Initialization
  initialize(): Promise<void>;
}

/**
 * Adapter that wraps TrackerService to provide async interface for UI
 */
export class TrackerServiceAdapter implements TrackerServiceInterface {
  private trackerService: ITrackerService;

  constructor(storage?: Storage) {
    this.trackerService = new TrackerService(storage);
  }

  /**
   * Initialize the application
   */
  async initialize(): Promise<void> {
    // TrackerService initialization is synchronous, wrap in Promise
    return Promise.resolve(this.trackerService.initialize());
  }

  // ==================== Course Operations ====================

  /**
   * Create a new course
   */
  async createCourse(name: string, department: string): Promise<Result<Course, ValidationError>> {
    return Promise.resolve(this.trackerService.createCourse(name, department));
  }

  /**
   * Get a course by ID
   */
  getCourse(id: string): Course | null {
    return this.trackerService.getCourse(id);
  }

  /**
   * Get all courses
   */
  getAllCourses(): Course[] {
    return this.trackerService.getAllCourses();
  }

  /**
   * Update a course
   */
  async updateCourse(id: string, name: string, department: string): Promise<Result<Course, ValidationError>> {
    return Promise.resolve(
      this.trackerService.updateCourse(id, { name, department })
    );
  }

  /**
   * Delete a course
   * @param strategy - 'cascade' to delete tasks, 'cancel' to abort if tasks exist
   */
  async deleteCourse(id: string, strategy?: 'cascade' | 'cancel'): Promise<Result<void, Error>> {
    // Check if course has tasks
    const hasAssociatedTasks = this.trackerService.hasAssociatedTasks(id);
    
    if (hasAssociatedTasks && strategy === 'cancel') {
      return Promise.resolve({
        success: false,
        error: new Error('Cannot delete course with associated tasks')
      });
    }
    
    if (hasAssociatedTasks && strategy === 'cascade') {
      return Promise.resolve(this.trackerService.deleteCourse(id, 'cascade'));
    }
    
    if (hasAssociatedTasks && !strategy) {
      return Promise.resolve({
        success: false,
        error: new ValidationError('Course has associated tasks. Please specify a deletion strategy.')
      });
    }
    
    return Promise.resolve(this.trackerService.deleteCourse(id));
  }

  // ==================== Task Operations ====================

  /**
   * Create a new task
   */
  async createTask(courseId: string, description: string, deadline: Date): Promise<Result<Task, ValidationError>> {
    return Promise.resolve(this.trackerService.createTask(courseId, description, deadline));
  }

  /**
   * Get a task by ID
   */
  getTask(id: string): Task | null {
    return this.trackerService.getTask(id);
  }

  /**
   * Get all tasks
   */
  getAllTasks(): Task[] {
    return this.trackerService.getAllTasks();
  }

  /**
   * Get all tasks for a specific week
   */
  getTasksForWeek(weekNumber: number, year: number): Task[] {
    return this.trackerService.getTasksForWeek(weekNumber, year);
  }

  /**
   * Update a task
   */
  async updateTask(id: string, description: string, deadline: Date): Promise<Result<Task, ValidationError>> {
    return Promise.resolve(
      this.trackerService.updateTask(id, { description, deadline })
    );
  }

  /**
   * Delete a task
   */
  async deleteTask(id: string): Promise<Result<void, Error>> {
    return Promise.resolve(this.trackerService.deleteTask(id));
  }

  /**
   * Toggle task completion status
   */
  async toggleTaskComplete(id: string, completed: boolean): Promise<Result<Task, Error>> {
    if (completed) {
      return Promise.resolve(this.trackerService.markTaskComplete(id));
    } else {
      return Promise.resolve(this.trackerService.markTaskIncomplete(id));
    }
  }

  /**
   * Get all overdue tasks
   */
  getOverdueTasks(): Task[] {
    return this.trackerService.getOverdueTasks();
  }

  // ==================== Statistics Operations ====================

  /**
   * Get comprehensive statistics for a specific week
   */
  getWeeklyStatistics(weekNumber: number, year: number): WeeklyStatistics {
    return this.trackerService.getWeeklyStatistics(weekNumber, year);
  }

  // ==================== Utility Operations ====================

  /**
   * Get task count for each course
   */
  getTaskCountByCourse(): Map<string, number> {
    const taskCounts = new Map<string, number>();
    const courses = this.trackerService.getAllCourses();
    
    for (const course of courses) {
      const tasks = this.trackerService.getTasksByCourse(course.id);
      taskCounts.set(course.id, tasks.length);
    }
    
    return taskCounts;
  }
}
