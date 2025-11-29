/**
 * TaskService provides CRUD operations for tasks
 * Handles validation, week association, and persistence
 */

import { Task, Result } from '../models/types.js';
import { ValidationError, NotFoundError } from '../models/errors.js';
import { IStorageService } from '../storage/StorageService.js';
import { validateNonEmptyString, isValidDate } from '../utils/validation.js';
import { generateUUID } from '../utils/uuid.js';
import { isDateInWeek } from '../utils/weekCalculations.js';

const TASKS_STORAGE_KEY = 'tracker:tasks';

/**
 * TaskService interface
 */
export interface ITaskService {
  createTask(courseId: string, description: string, deadline: Date): Result<Task, ValidationError>;
  getTask(id: string): Task | null;
  getAllTasks(): Task[];
  getTasksByCourse(courseId: string): Task[];
  getTasksForWeek(weekNumber: number, year: number): Task[];
  updateTask(id: string, updates: Partial<Task>): Result<Task, ValidationError>;
  deleteTask(id: string): Result<void, Error>;
  markComplete(id: string): Result<Task, Error>;
  markIncomplete(id: string): Result<Task, Error>;
  getOverdueTasks(): Task[];
}

/**
 * TaskService implementation
 */
export class TaskService implements ITaskService {
  private storage: IStorageService;
  private tasks: Map<string, Task>;

  constructor(storage: IStorageService) {
    this.storage = storage;
    this.tasks = new Map();
    this.loadTasks();
  }

  /**
   * Load tasks from storage into memory
   */
  private loadTasks(): void {
    const result = this.storage.load<Task[]>(TASKS_STORAGE_KEY);
    if (result.success) {
      this.tasks = new Map(result.value.map(task => [task.id, task]));
    } else {
      // Initialize with empty map if no data exists
      this.tasks = new Map();
    }
  }

  /**
   * Save tasks to storage
   */
  private saveTasks(): Result<void, Error> {
    const tasksArray = Array.from(this.tasks.values());
    const result = this.storage.save(TASKS_STORAGE_KEY, tasksArray);
    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true, value: undefined };
  }

  /**
   * Create a new task with validation
   */
  createTask(courseId: string, description: string, deadline: Date): Result<Task, ValidationError> {
    // Validate description
    const validatedDescription = validateNonEmptyString(description);
    if (validatedDescription === null) {
      return {
        success: false,
        error: new ValidationError('Task description cannot be empty or whitespace only')
      };
    }

    // Validate deadline
    if (!isValidDate(deadline)) {
      return {
        success: false,
        error: new ValidationError('Deadline must be a valid date')
      };
    }

    // Validate courseId is non-empty
    const validatedCourseId = validateNonEmptyString(courseId);
    if (validatedCourseId === null) {
      return {
        success: false,
        error: new ValidationError('Course ID cannot be empty')
      };
    }

    // Create task
    const task: Task = {
      id: generateUUID(),
      courseId: validatedCourseId,
      description: validatedDescription,
      deadline: deadline,
      completed: false,
      createdAt: new Date()
    };

    // Add to memory
    this.tasks.set(task.id, task);

    // Save to storage
    const saveResult = this.saveTasks();
    if (!saveResult.success) {
      // Rollback in-memory change
      this.tasks.delete(task.id);
      return {
        success: false,
        error: new ValidationError(`Failed to save task: ${saveResult.error.message}`)
      };
    }

    return { success: true, value: task };
  }

  /**
   * Get a task by ID
   */
  getTask(id: string): Task | null {
    return this.tasks.get(id) || null;
  }

  /**
   * Get all tasks
   */
  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get all tasks for a specific course
   */
  getTasksByCourse(courseId: string): Task[] {
    return Array.from(this.tasks.values()).filter(task => task.courseId === courseId);
  }

  /**
   * Get all tasks for a specific week
   */
  getTasksForWeek(weekNumber: number, year: number): Task[] {
    return Array.from(this.tasks.values()).filter(task => 
      isDateInWeek(task.deadline, weekNumber, year)
    );
  }

  /**
   * Update a task
   */
  updateTask(id: string, updates: Partial<Task>): Result<Task, ValidationError> {
    // Check if task exists
    const existingTask = this.tasks.get(id);
    if (!existingTask) {
      return {
        success: false,
        error: new ValidationError(`Task with ID "${id}" not found`)
      };
    }

    // Validate description if provided
    let validatedDescription = existingTask.description;
    if (updates.description !== undefined) {
      const validated = validateNonEmptyString(updates.description);
      if (validated === null) {
        return {
          success: false,
          error: new ValidationError('Task description cannot be empty or whitespace only')
        };
      }
      validatedDescription = validated;
    }

    // Validate deadline if provided
    let validatedDeadline = existingTask.deadline;
    if (updates.deadline !== undefined) {
      if (!isValidDate(updates.deadline)) {
        return {
          success: false,
          error: new ValidationError('Deadline must be a valid date')
        };
      }
      validatedDeadline = updates.deadline;
    }

    // Validate courseId if provided
    let validatedCourseId = existingTask.courseId;
    if (updates.courseId !== undefined) {
      const validated = validateNonEmptyString(updates.courseId);
      if (validated === null) {
        return {
          success: false,
          error: new ValidationError('Course ID cannot be empty')
        };
      }
      validatedCourseId = validated;
    }

    // Create updated task
    const updatedTask: Task = {
      ...existingTask,
      courseId: validatedCourseId,
      description: validatedDescription,
      deadline: validatedDeadline,
      completed: updates.completed !== undefined ? updates.completed : existingTask.completed,
      completedAt: updates.completedAt !== undefined ? updates.completedAt : existingTask.completedAt
    };

    // Update in memory
    this.tasks.set(id, updatedTask);

    // Save to storage
    const saveResult = this.saveTasks();
    if (!saveResult.success) {
      // Rollback in-memory change
      this.tasks.set(id, existingTask);
      return {
        success: false,
        error: new ValidationError(`Failed to save task: ${saveResult.error.message}`)
      };
    }

    return { success: true, value: updatedTask };
  }

  /**
   * Delete a task
   */
  deleteTask(id: string): Result<void, Error> {
    // Check if task exists
    const existingTask = this.tasks.get(id);
    if (!existingTask) {
      return {
        success: false,
        error: new NotFoundError(`Task with ID "${id}" not found`)
      };
    }

    // Delete from memory
    this.tasks.delete(id);

    // Save to storage
    const saveResult = this.saveTasks();
    if (!saveResult.success) {
      // Rollback in-memory change
      this.tasks.set(id, existingTask);
      return {
        success: false,
        error: saveResult.error
      };
    }

    return { success: true, value: undefined };
  }

  /**
   * Mark a task as complete
   */
  markComplete(id: string): Result<Task, Error> {
    // Check if task exists
    const existingTask = this.tasks.get(id);
    if (!existingTask) {
      return {
        success: false,
        error: new NotFoundError(`Task with ID "${id}" not found`)
      };
    }

    // Create updated task with completion status
    const updatedTask: Task = {
      ...existingTask,
      completed: true,
      completedAt: new Date()
    };

    // Update in memory
    this.tasks.set(id, updatedTask);

    // Save to storage
    const saveResult = this.saveTasks();
    if (!saveResult.success) {
      // Rollback in-memory change
      this.tasks.set(id, existingTask);
      return {
        success: false,
        error: saveResult.error
      };
    }

    return { success: true, value: updatedTask };
  }

  /**
   * Mark a task as incomplete
   */
  markIncomplete(id: string): Result<Task, Error> {
    // Check if task exists
    const existingTask = this.tasks.get(id);
    if (!existingTask) {
      return {
        success: false,
        error: new NotFoundError(`Task with ID "${id}" not found`)
      };
    }

    // Create updated task with incomplete status
    const updatedTask: Task = {
      ...existingTask,
      completed: false,
      completedAt: undefined
    };

    // Update in memory
    this.tasks.set(id, updatedTask);

    // Save to storage
    const saveResult = this.saveTasks();
    if (!saveResult.success) {
      // Rollback in-memory change
      this.tasks.set(id, existingTask);
      return {
        success: false,
        error: saveResult.error
      };
    }

    return { success: true, value: updatedTask };
  }

  /**
   * Get all overdue tasks (incomplete tasks with deadline in the past)
   */
  getOverdueTasks(): Task[] {
    const now = new Date();
    return Array.from(this.tasks.values()).filter(task => 
      !task.completed && task.deadline < now
    );
  }
}
