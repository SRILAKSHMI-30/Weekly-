/**
 * Property-based tests for TaskService
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { TaskService } from './TaskService.js';
import { CourseService } from './CourseService.js';
import { StorageService } from '../storage/StorageService.js';
import { ValidationError } from '../models/errors.js';
import { Task, Course } from '../models/types.js';
import { getWeekNumber, getWeekBounds } from '../utils/weekCalculations.js';

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

describe('TaskService', () => {
  let storage: MockStorage;
  let storageService: StorageService;
  let courseService: CourseService;
  let taskService: TaskService;

  beforeEach(() => {
    storage = new MockStorage();
    storageService = new StorageService(storage);
    courseService = new CourseService(storageService);
    taskService = new TaskService(storageService);
  });

  /**
   * **Feature: weekly-course-tracker, Property 5: Task creation and week association**
   * **Validates: Requirements 2.1, 2.3**
   * 
   * For any valid task description, existing course ID, and deadline, creating a task 
   * should result in a task object associated with the correct course and appearing in 
   * the week view corresponding to the deadline's week.
   */
  describe('Property 5: Task creation and week association', () => {
    it('should create tasks associated with the correct course and week', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 200 }).filter((s: string) => s.trim().length > 0),
          fc.date({ 
            min: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
            max: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)  // 90 days ahead
          }),
          (courseName: string, department: string, taskDescription: string, deadline: Date) => {
            // Reset services for each test
            storage.clear();
            const freshStorageService = new StorageService(storage);
            const freshCourseService = new CourseService(freshStorageService);
            const freshTaskService = new TaskService(freshStorageService);

            // Create a course first
            const courseResult = freshCourseService.createCourse(courseName, department);
            expect(courseResult.success).toBe(true);
            
            if (!courseResult.success) return;
            
            const course = courseResult.value;

            // Create a task for this course
            const taskResult = freshTaskService.createTask(course.id, taskDescription, deadline);
            
            // Should succeed
            expect(taskResult.success).toBe(true);
            
            if (!taskResult.success) return;
            
            const task = taskResult.value;

            // Verify task has correct properties
            expect(task.id).toBeDefined();
            expect(typeof task.id).toBe('string');
            expect(task.id.length).toBeGreaterThan(0);
            
            // Verify task is associated with the correct course
            expect(task.courseId).toBe(course.id);
            expect(task.description).toBe(taskDescription.trim());
            expect(task.deadline).toEqual(deadline);
            expect(task.completed).toBe(false);
            expect(task.completedAt).toBeUndefined();
            expect(task.createdAt).toBeInstanceOf(Date);

            // Verify task appears in the correct week view
            const taskWeek = getWeekNumber(deadline);
            const tasksForWeek = freshTaskService.getTasksForWeek(taskWeek.weekNumber, taskWeek.year);
            
            // The task should be in the week corresponding to its deadline
            const foundInWeek = tasksForWeek.find(t => t.id === task.id);
            expect(foundInWeek).toBeDefined();
            expect(foundInWeek?.id).toBe(task.id);
            expect(foundInWeek?.courseId).toBe(course.id);
            expect(foundInWeek?.description).toBe(taskDescription.trim());

            // Verify task can be retrieved by course
            const tasksForCourse = freshTaskService.getTasksByCourse(course.id);
            const foundInCourse = tasksForCourse.find(t => t.id === task.id);
            expect(foundInCourse).toBeDefined();
            expect(foundInCourse?.id).toBe(task.id);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should create multiple tasks for the same course and associate them with correct weeks', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
          fc.array(
            fc.record({
              description: fc.string({ minLength: 1, maxLength: 200 }).filter((s: string) => s.trim().length > 0),
              deadline: fc.date({ 
                min: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                max: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
              })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (courseName: string, department: string, tasksData) => {
            // Reset services for each test
            storage.clear();
            const freshStorageService = new StorageService(storage);
            const freshCourseService = new CourseService(freshStorageService);
            const freshTaskService = new TaskService(freshStorageService);

            // Create a course
            const courseResult = freshCourseService.createCourse(courseName, department);
            expect(courseResult.success).toBe(true);
            
            if (!courseResult.success) return;
            
            const course = courseResult.value;

            // Create all tasks
            const createdTasks: Task[] = [];
            for (const taskData of tasksData) {
              const taskResult = freshTaskService.createTask(
                course.id,
                taskData.description,
                taskData.deadline
              );
              expect(taskResult.success).toBe(true);
              if (taskResult.success) {
                createdTasks.push(taskResult.value);
              }
            }

            // Verify all tasks are associated with the course
            const tasksForCourse = freshTaskService.getTasksByCourse(course.id);
            expect(tasksForCourse.length).toBe(createdTasks.length);

            // Verify each task appears in the correct week
            for (const task of createdTasks) {
              const taskWeek = getWeekNumber(task.deadline);
              const tasksForWeek = freshTaskService.getTasksForWeek(taskWeek.weekNumber, taskWeek.year);
              
              const foundInWeek = tasksForWeek.find(t => t.id === task.id);
              expect(foundInWeek).toBeDefined();
              expect(foundInWeek?.courseId).toBe(course.id);
            }

            // Verify tasks are distributed correctly across weeks
            const weekMap = new Map<string, Task[]>();
            for (const task of createdTasks) {
              const taskWeek = getWeekNumber(task.deadline);
              const weekKey = `${taskWeek.year}-W${taskWeek.weekNumber}`;
              
              if (!weekMap.has(weekKey)) {
                weekMap.set(weekKey, []);
              }
              weekMap.get(weekKey)!.push(task);
            }

            // Verify each week contains the expected tasks
            for (const [weekKey, expectedTasks] of weekMap.entries()) {
              const [yearStr, weekStr] = weekKey.split('-W');
              const year = parseInt(yearStr);
              const weekNumber = parseInt(weekStr);
              
              const tasksForWeek = freshTaskService.getTasksForWeek(weekNumber, year);
              
              // All expected tasks should be in this week
              for (const expectedTask of expectedTasks) {
                const found = tasksForWeek.find(t => t.id === expectedTask.id);
                expect(found).toBeDefined();
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should create tasks for multiple courses and maintain correct associations', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              courseName: fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
              department: fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
              tasks: fc.array(
                fc.record({
                  description: fc.string({ minLength: 1, maxLength: 200 }).filter((s: string) => s.trim().length > 0),
                  deadline: fc.date({ 
                    min: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    max: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
                  })
                }),
                { minLength: 1, maxLength: 5 }
              )
            }),
            { minLength: 2, maxLength: 5 }
          ).filter((courses) => {
            // Ensure all courses have unique (name, department) pairs
            const seen = new Set<string>();
            for (const course of courses) {
              const key = `${course.courseName.trim()}:${course.department.trim()}`;
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
            const freshTaskService = new TaskService(freshStorageService);

            // Create courses and their tasks
            const courseTaskMap = new Map<string, Task[]>();
            
            for (const courseData of coursesData) {
              // Create course
              const courseResult = freshCourseService.createCourse(
                courseData.courseName,
                courseData.department
              );
              expect(courseResult.success).toBe(true);
              
              if (!courseResult.success) continue;
              
              const course = courseResult.value;
              const courseTasks: Task[] = [];

              // Create tasks for this course
              for (const taskData of courseData.tasks) {
                const taskResult = freshTaskService.createTask(
                  course.id,
                  taskData.description,
                  taskData.deadline
                );
                expect(taskResult.success).toBe(true);
                
                if (taskResult.success) {
                  courseTasks.push(taskResult.value);
                }
              }
              
              courseTaskMap.set(course.id, courseTasks);
            }

            // Verify each course has the correct tasks
            for (const [courseId, expectedTasks] of courseTaskMap.entries()) {
              const tasksForCourse = freshTaskService.getTasksByCourse(courseId);
              expect(tasksForCourse.length).toBe(expectedTasks.length);

              // Verify all expected tasks are present
              for (const expectedTask of expectedTasks) {
                const found = tasksForCourse.find(t => t.id === expectedTask.id);
                expect(found).toBeDefined();
                expect(found?.courseId).toBe(courseId);
              }

              // Verify no tasks from other courses are included
              for (const task of tasksForCourse) {
                expect(task.courseId).toBe(courseId);
              }
            }

            // Verify tasks appear in correct weeks regardless of course
            const allTasks = freshTaskService.getAllTasks();
            for (const task of allTasks) {
              const taskWeek = getWeekNumber(task.deadline);
              const tasksForWeek = freshTaskService.getTasksForWeek(taskWeek.weekNumber, taskWeek.year);
              
              const foundInWeek = tasksForWeek.find(t => t.id === task.id);
              expect(foundInWeek).toBeDefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle tasks with deadlines in different years', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
          fc.integer({ min: 2020, max: 2030 }),
          fc.integer({ min: 1, max: 53 }),
          fc.string({ minLength: 1, maxLength: 200 }).filter((s: string) => s.trim().length > 0),
          (courseName: string, department: string, year: number, weekNumber: number, description: string) => {
            // Reset services for each test
            storage.clear();
            const freshStorageService = new StorageService(storage);
            const freshCourseService = new CourseService(freshStorageService);
            const freshTaskService = new TaskService(freshStorageService);

            // Create a course
            const courseResult = freshCourseService.createCourse(courseName, department);
            expect(courseResult.success).toBe(true);
            
            if (!courseResult.success) return;
            
            const course = courseResult.value;

            // Create a deadline in a specific year and week
            // Use the middle of the year to avoid edge cases with week 53
            const deadline = new Date(year, 5, 15); // June 15th of the specified year

            // Create task
            const taskResult = freshTaskService.createTask(course.id, description, deadline);
            expect(taskResult.success).toBe(true);
            
            if (!taskResult.success) return;
            
            const task = taskResult.value;

            // Get the actual week of the deadline
            const actualWeek = getWeekNumber(deadline);

            // Verify task appears in the correct week
            const tasksForWeek = freshTaskService.getTasksForWeek(actualWeek.weekNumber, actualWeek.year);
            const foundInWeek = tasksForWeek.find(t => t.id === task.id);
            expect(foundInWeek).toBeDefined();

            // Verify task does NOT appear in other weeks
            const otherWeekNumber = actualWeek.weekNumber === 1 ? 2 : actualWeek.weekNumber - 1;
            const tasksForOtherWeek = freshTaskService.getTasksForWeek(otherWeekNumber, actualWeek.year);
            const foundInOtherWeek = tasksForOtherWeek.find(t => t.id === task.id);
            expect(foundInOtherWeek).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should persist task-course-week associations across service restarts', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 200 }).filter((s: string) => s.trim().length > 0),
          fc.date({ 
            min: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            max: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
          }),
          (courseName: string, department: string, taskDescription: string, deadline: Date) => {
            // Reset services for each test
            storage.clear();
            const freshStorageService = new StorageService(storage);
            const freshCourseService = new CourseService(freshStorageService);
            const freshTaskService = new TaskService(freshStorageService);

            // Create course and task
            const courseResult = freshCourseService.createCourse(courseName, department);
            expect(courseResult.success).toBe(true);
            
            if (!courseResult.success) return;
            
            const course = courseResult.value;

            const taskResult = freshTaskService.createTask(course.id, taskDescription, deadline);
            expect(taskResult.success).toBe(true);
            
            if (!taskResult.success) return;
            
            const task = taskResult.value;
            const taskWeek = getWeekNumber(deadline);

            // Simulate app restart by creating new service instances
            const newStorageService = new StorageService(storage);
            const newCourseService = new CourseService(newStorageService);
            const newTaskService = new TaskService(newStorageService);

            // Verify task still exists and has correct associations
            const retrievedTask = newTaskService.getTask(task.id);
            expect(retrievedTask).not.toBeNull();
            expect(retrievedTask?.courseId).toBe(course.id);
            expect(retrievedTask?.description).toBe(taskDescription.trim());

            // Verify task still appears in correct week
            const tasksForWeek = newTaskService.getTasksForWeek(taskWeek.weekNumber, taskWeek.year);
            const foundInWeek = tasksForWeek.find(t => t.id === task.id);
            expect(foundInWeek).toBeDefined();

            // Verify task still appears in course tasks
            const tasksForCourse = newTaskService.getTasksByCourse(course.id);
            const foundInCourse = tasksForCourse.find(t => t.id === task.id);
            expect(foundInCourse).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: weekly-course-tracker, Property 7: Week view filtering**
   * **Validates: Requirements 2.4, 4.1**
   * 
   * For any week number and year, retrieving tasks for that week should return only 
   * tasks whose deadlines fall within that week, organized by course.
   */
  describe('Property 7: Week view filtering', () => {
    it('should return only tasks whose deadlines fall within the specified week', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
          fc.integer({ min: 2020, max: 2030 }),
          fc.integer({ min: 1, max: 52 }), // Use 1-52 to avoid edge cases with week 53
          fc.array(
            fc.record({
              description: fc.string({ minLength: 1, maxLength: 200 }).filter((s: string) => s.trim().length > 0),
              weekOffset: fc.integer({ min: -2, max: 2 }) // Tasks in different weeks relative to target
            }),
            { minLength: 3, maxLength: 10 }
          ),
          (courseName: string, department: string, targetYear: number, targetWeek: number, tasksData) => {
            // Reset services for each test
            storage.clear();
            const freshStorageService = new StorageService(storage);
            const freshCourseService = new CourseService(freshStorageService);
            const freshTaskService = new TaskService(freshStorageService);

            // Create a course
            const courseResult = freshCourseService.createCourse(courseName, department);
            expect(courseResult.success).toBe(true);
            
            if (!courseResult.success) return;
            
            const course = courseResult.value;

            // Get the bounds of the target week
            const { startDate: targetStartDate } = getWeekBounds(targetWeek, targetYear);

            // Create tasks with deadlines in various weeks
            const tasksInTargetWeek: Task[] = [];
            const tasksOutsideTargetWeek: Task[] = [];

            for (const taskData of tasksData) {
              // Calculate deadline based on week offset
              const deadline = new Date(targetStartDate);
              deadline.setDate(deadline.getDate() + (taskData.weekOffset * 7) + 2); // +2 to land mid-week

              const taskResult = freshTaskService.createTask(
                course.id,
                taskData.description,
                deadline
              );
              
              expect(taskResult.success).toBe(true);
              
              if (!taskResult.success) continue;
              
              const task = taskResult.value;

              // Categorize task based on whether it's in the target week
              const taskWeek = getWeekNumber(deadline);
              if (taskWeek.weekNumber === targetWeek && taskWeek.year === targetYear) {
                tasksInTargetWeek.push(task);
              } else {
                tasksOutsideTargetWeek.push(task);
              }
            }

            // Get tasks for the target week
            const retrievedTasks = freshTaskService.getTasksForWeek(targetWeek, targetYear);

            // Verify all tasks in target week are returned
            for (const expectedTask of tasksInTargetWeek) {
              const found = retrievedTasks.find(t => t.id === expectedTask.id);
              expect(found).toBeDefined();
              expect(found?.courseId).toBe(course.id);
            }

            // Verify no tasks outside target week are returned
            for (const unexpectedTask of tasksOutsideTargetWeek) {
              const found = retrievedTasks.find(t => t.id === unexpectedTask.id);
              expect(found).toBeUndefined();
            }

            // Verify the count matches
            expect(retrievedTasks.length).toBe(tasksInTargetWeek.length);

            // Verify all returned tasks have deadlines in the target week
            for (const task of retrievedTasks) {
              const taskWeek = getWeekNumber(task.deadline);
              expect(taskWeek.weekNumber).toBe(targetWeek);
              expect(taskWeek.year).toBe(targetYear);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should organize tasks by course when multiple courses have tasks in the same week', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              courseName: fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
              department: fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
              taskCount: fc.integer({ min: 1, max: 5 })
            }),
            { minLength: 2, maxLength: 4 }
          ).filter((courses) => {
            // Ensure all courses have unique (name, department) pairs
            const seen = new Set<string>();
            for (const course of courses) {
              const key = `${course.courseName.trim()}:${course.department.trim()}`;
              if (seen.has(key)) return false;
              seen.add(key);
            }
            return true;
          }),
          fc.integer({ min: 2020, max: 2030 }),
          fc.integer({ min: 1, max: 52 }),
          (coursesData, targetYear: number, targetWeek: number) => {
            // Reset services for each test
            storage.clear();
            const freshStorageService = new StorageService(storage);
            const freshCourseService = new CourseService(freshStorageService);
            const freshTaskService = new TaskService(freshStorageService);

            // Get the bounds of the target week
            const { startDate: targetStartDate } = getWeekBounds(targetWeek, targetYear);

            // Create courses and tasks
            const courseTaskMap = new Map<string, Task[]>();

            for (const courseData of coursesData) {
              // Create course
              const courseResult = freshCourseService.createCourse(
                courseData.courseName,
                courseData.department
              );
              expect(courseResult.success).toBe(true);
              
              if (!courseResult.success) continue;
              
              const course = courseResult.value;
              const courseTasks: Task[] = [];

              // Create tasks for this course in the target week
              for (let i = 0; i < courseData.taskCount; i++) {
                const deadline = new Date(targetStartDate);
                deadline.setDate(deadline.getDate() + i); // Spread across the week

                const taskResult = freshTaskService.createTask(
                  course.id,
                  `Task ${i + 1} for ${course.name}`,
                  deadline
                );
                
                expect(taskResult.success).toBe(true);
                
                if (taskResult.success) {
                  courseTasks.push(taskResult.value);
                }
              }
              
              courseTaskMap.set(course.id, courseTasks);
            }

            // Get tasks for the target week
            const retrievedTasks = freshTaskService.getTasksForWeek(targetWeek, targetYear);

            // Verify all tasks from all courses are present
            let expectedTotalTasks = 0;
            for (const [courseId, expectedTasks] of courseTaskMap.entries()) {
              expectedTotalTasks += expectedTasks.length;
              
              // Verify each expected task is in the retrieved tasks
              for (const expectedTask of expectedTasks) {
                const found = retrievedTasks.find(t => t.id === expectedTask.id);
                expect(found).toBeDefined();
                expect(found?.courseId).toBe(courseId);
              }
            }

            // Verify the total count matches
            expect(retrievedTasks.length).toBe(expectedTotalTasks);

            // Verify tasks can be grouped by course
            const tasksByCourse = new Map<string, Task[]>();
            for (const task of retrievedTasks) {
              if (!tasksByCourse.has(task.courseId)) {
                tasksByCourse.set(task.courseId, []);
              }
              tasksByCourse.get(task.courseId)!.push(task);
            }

            // Verify each course's tasks are correctly grouped
            for (const [courseId, expectedTasks] of courseTaskMap.entries()) {
              const groupedTasks = tasksByCourse.get(courseId) || [];
              expect(groupedTasks.length).toBe(expectedTasks.length);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return empty array when no tasks exist for the specified week', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
          fc.integer({ min: 2020, max: 2030 }),
          fc.integer({ min: 1, max: 52 }),
          fc.integer({ min: 1, max: 52 }),
          (courseName: string, department: string, year: number, taskWeek: number, queryWeek: number) => {
            // Ensure query week is different from task week
            if (taskWeek === queryWeek) return;

            // Reset services for each test
            storage.clear();
            const freshStorageService = new StorageService(storage);
            const freshCourseService = new CourseService(freshStorageService);
            const freshTaskService = new TaskService(freshStorageService);

            // Create a course
            const courseResult = freshCourseService.createCourse(courseName, department);
            expect(courseResult.success).toBe(true);
            
            if (!courseResult.success) return;
            
            const course = courseResult.value;

            // Create a task in a specific week
            const { startDate: taskWeekStart } = getWeekBounds(taskWeek, year);
            const deadline = new Date(taskWeekStart);
            deadline.setDate(deadline.getDate() + 2); // Mid-week

            const taskResult = freshTaskService.createTask(
              course.id,
              'Test task',
              deadline
            );
            
            expect(taskResult.success).toBe(true);

            // Query a different week
            const retrievedTasks = freshTaskService.getTasksForWeek(queryWeek, year);

            // Should return empty array
            expect(retrievedTasks).toEqual([]);
            expect(retrievedTasks.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly filter tasks across year boundaries', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
          fc.integer({ min: 2020, max: 2029 }),
          (courseName: string, department: string, year: number) => {
            // Reset services for each test
            storage.clear();
            const freshStorageService = new StorageService(storage);
            const freshCourseService = new CourseService(freshStorageService);
            const freshTaskService = new TaskService(freshStorageService);

            // Create a course
            const courseResult = freshCourseService.createCourse(courseName, department);
            expect(courseResult.success).toBe(true);
            
            if (!courseResult.success) return;
            
            const course = courseResult.value;

            // Create tasks in week 1 of consecutive years
            const deadline1 = new Date(year, 0, 7); // Early January of year
            const deadline2 = new Date(year + 1, 0, 7); // Early January of year + 1

            const task1Result = freshTaskService.createTask(
              course.id,
              'Task in year 1',
              deadline1
            );
            
            const task2Result = freshTaskService.createTask(
              course.id,
              'Task in year 2',
              deadline2
            );
            
            expect(task1Result.success).toBe(true);
            expect(task2Result.success).toBe(true);
            
            if (!task1Result.success || !task2Result.success) return;

            const task1 = task1Result.value;
            const task2 = task2Result.value;

            // Get the actual weeks for these tasks
            const week1 = getWeekNumber(deadline1);
            const week2 = getWeekNumber(deadline2);

            // Query tasks for year 1
            const tasksYear1 = freshTaskService.getTasksForWeek(week1.weekNumber, week1.year);
            
            // Query tasks for year 2
            const tasksYear2 = freshTaskService.getTasksForWeek(week2.weekNumber, week2.year);

            // Verify task1 is only in year 1
            const foundInYear1 = tasksYear1.find(t => t.id === task1.id);
            expect(foundInYear1).toBeDefined();
            
            const foundInYear2FromTask1 = tasksYear2.find(t => t.id === task1.id);
            expect(foundInYear2FromTask1).toBeUndefined();

            // Verify task2 is only in year 2
            const foundInYear2 = tasksYear2.find(t => t.id === task2.id);
            expect(foundInYear2).toBeDefined();
            
            const foundInYear1FromTask2 = tasksYear1.find(t => t.id === task2.id);
            expect(foundInYear1FromTask2).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: weekly-course-tracker, Property 8: Overdue task detection**
   * **Validates: Requirements 2.5**
   * 
   * For any incomplete task with a deadline in the past, the system should identify it as overdue.
   */
  describe('Property 8: Overdue task detection', () => {
    it('should identify incomplete tasks with past deadlines as overdue', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
          fc.array(
            fc.record({
              description: fc.string({ minLength: 1, maxLength: 200 }).filter((s: string) => s.trim().length > 0),
              daysOffset: fc.integer({ min: -30, max: 30 }), // Days relative to now (negative = past)
              completed: fc.boolean()
            }),
            { minLength: 3, maxLength: 15 }
          ),
          (courseName: string, department: string, tasksData) => {
            // Reset services for each test
            storage.clear();
            const freshStorageService = new StorageService(storage);
            const freshCourseService = new CourseService(freshStorageService);
            const freshTaskService = new TaskService(freshStorageService);

            // Create a course
            const courseResult = freshCourseService.createCourse(courseName, department);
            expect(courseResult.success).toBe(true);
            
            if (!courseResult.success) return;
            
            const course = courseResult.value;

            // Create tasks with various deadlines and completion states
            const now = new Date();
            const expectedOverdueTasks: Task[] = [];
            const allCreatedTasks: Task[] = [];

            for (const taskData of tasksData) {
              // Calculate deadline based on days offset
              const deadline = new Date(now);
              deadline.setDate(deadline.getDate() + taskData.daysOffset);

              // Create task
              const taskResult = freshTaskService.createTask(
                course.id,
                taskData.description,
                deadline
              );
              
              expect(taskResult.success).toBe(true);
              
              if (!taskResult.success) continue;
              
              let task = taskResult.value;

              // Mark as completed if needed
              if (taskData.completed) {
                const completeResult = freshTaskService.markComplete(task.id);
                expect(completeResult.success).toBe(true);
                if (completeResult.success) {
                  task = completeResult.value;
                }
              }

              allCreatedTasks.push(task);

              // Determine if this task should be overdue
              // A task is overdue if: deadline < now AND completed === false
              if (deadline < now && !task.completed) {
                expectedOverdueTasks.push(task);
              }
            }

            // Get overdue tasks from service
            const overdueTasks = freshTaskService.getOverdueTasks();

            // Verify all expected overdue tasks are returned
            for (const expectedTask of expectedOverdueTasks) {
              const found = overdueTasks.find(t => t.id === expectedTask.id);
              expect(found).toBeDefined();
              expect(found?.completed).toBe(false);
              expect(found?.deadline.getTime()).toBeLessThan(now.getTime());
            }

            // Verify no non-overdue tasks are returned
            // Note: We use a fresh "now" to account for time passing during test execution
            const nowForVerification = new Date();
            for (const task of allCreatedTasks) {
              const isInOverdue = overdueTasks.find(t => t.id === task.id) !== undefined;
              const shouldBeOverdue = task.deadline < nowForVerification && !task.completed;
              
              // Only check if the task is clearly not overdue (deadline is in the future)
              if (task.deadline > nowForVerification || task.completed) {
                expect(isInOverdue).toBe(false);
              }
            }

            // Verify all returned tasks meet overdue criteria
            const nowForCriteria = new Date();
            for (const task of overdueTasks) {
              expect(task.completed).toBe(false);
              expect(task.deadline.getTime()).toBeLessThanOrEqual(nowForCriteria.getTime());
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not include completed tasks as overdue even if deadline has passed', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
          fc.integer({ min: 1, max: 30 }), // Days in the past
          fc.string({ minLength: 1, maxLength: 200 }).filter((s: string) => s.trim().length > 0),
          (courseName: string, department: string, daysAgo: number, description: string) => {
            // Reset services for each test
            storage.clear();
            const freshStorageService = new StorageService(storage);
            const freshCourseService = new CourseService(freshStorageService);
            const freshTaskService = new TaskService(freshStorageService);

            // Create a course
            const courseResult = freshCourseService.createCourse(courseName, department);
            expect(courseResult.success).toBe(true);
            
            if (!courseResult.success) return;
            
            const course = courseResult.value;

            // Create a task with a past deadline
            const deadline = new Date();
            deadline.setDate(deadline.getDate() - daysAgo);

            const taskResult = freshTaskService.createTask(course.id, description, deadline);
            expect(taskResult.success).toBe(true);
            
            if (!taskResult.success) return;
            
            const task = taskResult.value;

            // Mark the task as complete
            const completeResult = freshTaskService.markComplete(task.id);
            expect(completeResult.success).toBe(true);

            // Get overdue tasks
            const overdueTasks = freshTaskService.getOverdueTasks();

            // The completed task should NOT be in the overdue list
            const foundInOverdue = overdueTasks.find(t => t.id === task.id);
            expect(foundInOverdue).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not include tasks with future deadlines as overdue', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
          fc.integer({ min: 1, max: 90 }), // Days in the future
          fc.string({ minLength: 1, maxLength: 200 }).filter((s: string) => s.trim().length > 0),
          (courseName: string, department: string, daysAhead: number, description: string) => {
            // Reset services for each test
            storage.clear();
            const freshStorageService = new StorageService(storage);
            const freshCourseService = new CourseService(freshStorageService);
            const freshTaskService = new TaskService(freshStorageService);

            // Create a course
            const courseResult = freshCourseService.createCourse(courseName, department);
            expect(courseResult.success).toBe(true);
            
            if (!courseResult.success) return;
            
            const course = courseResult.value;

            // Create a task with a future deadline
            const deadline = new Date();
            deadline.setDate(deadline.getDate() + daysAhead);

            const taskResult = freshTaskService.createTask(course.id, description, deadline);
            expect(taskResult.success).toBe(true);
            
            if (!taskResult.success) return;
            
            const task = taskResult.value;

            // Get overdue tasks
            const overdueTasks = freshTaskService.getOverdueTasks();

            // The future task should NOT be in the overdue list
            const foundInOverdue = overdueTasks.find(t => t.id === task.id);
            expect(foundInOverdue).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should update overdue status when task is marked complete', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
          fc.integer({ min: 1, max: 30 }), // Days in the past
          fc.string({ minLength: 1, maxLength: 200 }).filter((s: string) => s.trim().length > 0),
          (courseName: string, department: string, daysAgo: number, description: string) => {
            // Reset services for each test
            storage.clear();
            const freshStorageService = new StorageService(storage);
            const freshCourseService = new CourseService(freshStorageService);
            const freshTaskService = new TaskService(freshStorageService);

            // Create a course
            const courseResult = freshCourseService.createCourse(courseName, department);
            expect(courseResult.success).toBe(true);
            
            if (!courseResult.success) return;
            
            const course = courseResult.value;

            // Create an overdue task
            const deadline = new Date();
            deadline.setDate(deadline.getDate() - daysAgo);

            const taskResult = freshTaskService.createTask(course.id, description, deadline);
            expect(taskResult.success).toBe(true);
            
            if (!taskResult.success) return;
            
            const task = taskResult.value;

            // Verify task is initially overdue
            let overdueTasks = freshTaskService.getOverdueTasks();
            let foundInOverdue = overdueTasks.find(t => t.id === task.id);
            expect(foundInOverdue).toBeDefined();

            // Mark task as complete
            const completeResult = freshTaskService.markComplete(task.id);
            expect(completeResult.success).toBe(true);

            // Verify task is no longer overdue
            overdueTasks = freshTaskService.getOverdueTasks();
            foundInOverdue = overdueTasks.find(t => t.id === task.id);
            expect(foundInOverdue).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle overdue tasks across multiple courses', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              courseName: fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
              department: fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
              tasks: fc.array(
                fc.record({
                  description: fc.string({ minLength: 1, maxLength: 200 }).filter((s: string) => s.trim().length > 0),
                  daysOffset: fc.integer({ min: -30, max: 30 }),
                  completed: fc.boolean()
                }),
                { minLength: 1, maxLength: 5 }
              )
            }),
            { minLength: 2, maxLength: 4 }
          ).filter((courses) => {
            // Ensure all courses have unique (name, department) pairs
            const seen = new Set<string>();
            for (const course of courses) {
              const key = `${course.courseName.trim()}:${course.department.trim()}`;
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
            const freshTaskService = new TaskService(freshStorageService);

            const now = new Date();
            const allTasks: Task[] = [];

            // Create courses and tasks
            for (const courseData of coursesData) {
              // Create course
              const courseResult = freshCourseService.createCourse(
                courseData.courseName,
                courseData.department
              );
              expect(courseResult.success).toBe(true);
              
              if (!courseResult.success) continue;
              
              const course = courseResult.value;

              // Create tasks for this course
              for (const taskData of courseData.tasks) {
                const deadline = new Date(now);
                deadline.setDate(deadline.getDate() + taskData.daysOffset);

                const taskResult = freshTaskService.createTask(
                  course.id,
                  taskData.description,
                  deadline
                );
                
                expect(taskResult.success).toBe(true);
                
                if (!taskResult.success) continue;
                
                let task = taskResult.value;

                // Mark as completed if needed
                if (taskData.completed) {
                  const completeResult = freshTaskService.markComplete(task.id);
                  expect(completeResult.success).toBe(true);
                  if (completeResult.success) {
                    task = completeResult.value;
                  }
                }

                allTasks.push(task);
              }
            }

            // Get overdue tasks
            const overdueTasks = freshTaskService.getOverdueTasks();
            const nowForVerification = new Date();

            // Count expected overdue tasks based on current time
            const expectedOverdueCount = allTasks.filter(t => 
              !t.completed && t.deadline < nowForVerification
            ).length;

            // Verify the count matches (allowing for timing differences)
            expect(overdueTasks.length).toBe(expectedOverdueCount);

            // Verify all returned tasks meet overdue criteria
            for (const task of overdueTasks) {
              expect(task.completed).toBe(false);
              expect(task.deadline.getTime()).toBeLessThanOrEqual(nowForVerification.getTime());
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: weekly-course-tracker, Property 9: Task completion state change**
   * **Validates: Requirements 3.1, 3.2**
   * 
   * For any task, marking it as complete should update its status to completed 
   * and record a completion timestamp.
   */
  describe('Property 9: Task completion state change', () => {
    it('should update task status to completed and record completion timestamp', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 200 }).filter((s: string) => s.trim().length > 0),
          fc.date({ 
            min: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            max: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
          }),
          (courseName: string, department: string, taskDescription: string, deadline: Date) => {
            // Reset services for each test
            storage.clear();
            const freshStorageService = new StorageService(storage);
            const freshCourseService = new CourseService(freshStorageService);
            const freshTaskService = new TaskService(freshStorageService);

            // Create a course
            const courseResult = freshCourseService.createCourse(courseName, department);
            expect(courseResult.success).toBe(true);
            
            if (!courseResult.success) return;
            
            const course = courseResult.value;

            // Create a task
            const taskResult = freshTaskService.createTask(course.id, taskDescription, deadline);
            expect(taskResult.success).toBe(true);
            
            if (!taskResult.success) return;
            
            const task = taskResult.value;

            // Verify initial state
            expect(task.completed).toBe(false);
            expect(task.completedAt).toBeUndefined();

            // Record time before marking complete
            const beforeComplete = new Date();

            // Mark task as complete
            const completeResult = freshTaskService.markComplete(task.id);
            expect(completeResult.success).toBe(true);
            
            if (!completeResult.success) return;

            const completedTask = completeResult.value;

            // Verify completion state
            expect(completedTask.completed).toBe(true);
            expect(completedTask.completedAt).toBeDefined();
            expect(completedTask.completedAt).toBeInstanceOf(Date);
            
            // Verify completion timestamp is reasonable (within a few seconds)
            if (completedTask.completedAt) {
              expect(completedTask.completedAt.getTime()).toBeGreaterThanOrEqual(beforeComplete.getTime() - 1000);
              expect(completedTask.completedAt.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
            }

            // Verify other properties remain unchanged
            expect(completedTask.id).toBe(task.id);
            expect(completedTask.courseId).toBe(task.courseId);
            expect(completedTask.description).toBe(task.description);
            expect(completedTask.deadline).toEqual(task.deadline);
            expect(completedTask.createdAt).toEqual(task.createdAt);

            // Verify persistence - retrieve task and check state
            const retrievedTask = freshTaskService.getTask(task.id);
            expect(retrievedTask).not.toBeNull();
            expect(retrievedTask?.completed).toBe(true);
            expect(retrievedTask?.completedAt).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should persist completion state across service restarts', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 200 }).filter((s: string) => s.trim().length > 0),
          fc.date({ 
            min: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            max: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
          }),
          (courseName: string, department: string, taskDescription: string, deadline: Date) => {
            // Reset services for each test
            storage.clear();
            const freshStorageService = new StorageService(storage);
            const freshCourseService = new CourseService(freshStorageService);
            const freshTaskService = new TaskService(freshStorageService);

            // Create course and task
            const courseResult = freshCourseService.createCourse(courseName, department);
            expect(courseResult.success).toBe(true);
            
            if (!courseResult.success) return;
            
            const course = courseResult.value;

            const taskResult = freshTaskService.createTask(course.id, taskDescription, deadline);
            expect(taskResult.success).toBe(true);
            
            if (!taskResult.success) return;
            
            const task = taskResult.value;

            // Mark task as complete
            const completeResult = freshTaskService.markComplete(task.id);
            expect(completeResult.success).toBe(true);
            
            if (!completeResult.success) return;
            
            const completedTask = completeResult.value;

            // Simulate app restart
            const newStorageService = new StorageService(storage);
            const newTaskService = new TaskService(newStorageService);

            // Verify completion state persisted
            const retrievedTask = newTaskService.getTask(task.id);
            expect(retrievedTask).not.toBeNull();
            expect(retrievedTask?.completed).toBe(true);
            expect(retrievedTask?.completedAt).toBeDefined();
            
            // Compare timestamps (both should be Date objects after deserialization)
            if (retrievedTask?.completedAt && completedTask.completedAt) {
              expect(retrievedTask.completedAt.getTime()).toBe(completedTask.completedAt.getTime());
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: weekly-course-tracker, Property 10: Completion round-trip**
   * **Validates: Requirements 3.4**
   * 
   * For any task, marking it complete then marking it incomplete should restore 
   * it to an active state with completed status false.
   */
  describe('Property 10: Completion round-trip', () => {
    it('should restore task to active state after marking complete then incomplete', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 200 }).filter((s: string) => s.trim().length > 0),
          fc.date({ 
            min: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            max: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
          }),
          (courseName: string, department: string, taskDescription: string, deadline: Date) => {
            // Reset services for each test
            storage.clear();
            const freshStorageService = new StorageService(storage);
            const freshCourseService = new CourseService(freshStorageService);
            const freshTaskService = new TaskService(freshStorageService);

            // Create a course
            const courseResult = freshCourseService.createCourse(courseName, department);
            expect(courseResult.success).toBe(true);
            
            if (!courseResult.success) return;
            
            const course = courseResult.value;

            // Create a task
            const taskResult = freshTaskService.createTask(course.id, taskDescription, deadline);
            expect(taskResult.success).toBe(true);
            
            if (!taskResult.success) return;
            
            const originalTask = taskResult.value;

            // Verify initial state
            expect(originalTask.completed).toBe(false);
            expect(originalTask.completedAt).toBeUndefined();

            // Mark task as complete
            const completeResult = freshTaskService.markComplete(originalTask.id);
            expect(completeResult.success).toBe(true);
            
            if (!completeResult.success) return;
            
            const completedTask = completeResult.value;

            // Verify completed state
            expect(completedTask.completed).toBe(true);
            expect(completedTask.completedAt).toBeDefined();

            // Mark task as incomplete (round-trip)
            const incompleteResult = freshTaskService.markIncomplete(originalTask.id);
            expect(incompleteResult.success).toBe(true);
            
            if (!incompleteResult.success) return;
            
            const restoredTask = incompleteResult.value;

            // Verify restored to active state
            expect(restoredTask.completed).toBe(false);
            expect(restoredTask.completedAt).toBeUndefined();

            // Verify other properties remain unchanged
            expect(restoredTask.id).toBe(originalTask.id);
            expect(restoredTask.courseId).toBe(originalTask.courseId);
            expect(restoredTask.description).toBe(originalTask.description);
            expect(restoredTask.deadline).toEqual(originalTask.deadline);
            expect(restoredTask.createdAt).toEqual(originalTask.createdAt);

            // Verify persistence
            const retrievedTask = freshTaskService.getTask(originalTask.id);
            expect(retrievedTask).not.toBeNull();
            expect(retrievedTask?.completed).toBe(false);
            expect(retrievedTask?.completedAt).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle multiple round-trips correctly', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 200 }).filter((s: string) => s.trim().length > 0),
          fc.date({ 
            min: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            max: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
          }),
          fc.integer({ min: 2, max: 5 }),
          (courseName: string, department: string, taskDescription: string, deadline: Date, cycles: number) => {
            // Reset services for each test
            storage.clear();
            const freshStorageService = new StorageService(storage);
            const freshCourseService = new CourseService(freshStorageService);
            const freshTaskService = new TaskService(freshStorageService);

            // Create course and task
            const courseResult = freshCourseService.createCourse(courseName, department);
            expect(courseResult.success).toBe(true);
            
            if (!courseResult.success) return;
            
            const course = courseResult.value;

            const taskResult = freshTaskService.createTask(course.id, taskDescription, deadline);
            expect(taskResult.success).toBe(true);
            
            if (!taskResult.success) return;
            
            const originalTask = taskResult.value;

            // Perform multiple complete/incomplete cycles
            for (let i = 0; i < cycles; i++) {
              // Mark complete
              const completeResult = freshTaskService.markComplete(originalTask.id);
              expect(completeResult.success).toBe(true);
              
              if (!completeResult.success) return;
              
              const completedTask = completeResult.value;
              expect(completedTask.completed).toBe(true);
              expect(completedTask.completedAt).toBeDefined();

              // Mark incomplete
              const incompleteResult = freshTaskService.markIncomplete(originalTask.id);
              expect(incompleteResult.success).toBe(true);
              
              if (!incompleteResult.success) return;
              
              const restoredTask = incompleteResult.value;
              expect(restoredTask.completed).toBe(false);
              expect(restoredTask.completedAt).toBeUndefined();
            }

            // Final verification
            const finalTask = freshTaskService.getTask(originalTask.id);
            expect(finalTask).not.toBeNull();
            expect(finalTask?.completed).toBe(false);
            expect(finalTask?.completedAt).toBeUndefined();
            expect(finalTask?.id).toBe(originalTask.id);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: weekly-course-tracker, Property 13: Task update persistence**
   * **Validates: Requirements 5.1**
   * 
   * For any existing task and valid updates, modifying the task should result 
   * in the task having the new values while maintaining its ID.
   */
  describe('Property 13: Task update persistence', () => {
    it('should update task properties while maintaining ID', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 200 }).filter((s: string) => s.trim().length > 0),
          fc.date({ 
            min: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            max: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
          }),
          fc.string({ minLength: 1, maxLength: 200 }).filter((s: string) => s.trim().length > 0),
          fc.date({ 
            min: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            max: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
          }),
          (courseName: string, department: string, originalDescription: string, originalDeadline: Date, 
           newDescription: string, newDeadline: Date) => {
            // Reset services for each test
            storage.clear();
            const freshStorageService = new StorageService(storage);
            const freshCourseService = new CourseService(freshStorageService);
            const freshTaskService = new TaskService(freshStorageService);

            // Create a course
            const courseResult = freshCourseService.createCourse(courseName, department);
            expect(courseResult.success).toBe(true);
            
            if (!courseResult.success) return;
            
            const course = courseResult.value;

            // Create a task
            const taskResult = freshTaskService.createTask(course.id, originalDescription, originalDeadline);
            expect(taskResult.success).toBe(true);
            
            if (!taskResult.success) return;
            
            const originalTask = taskResult.value;

            // Update task
            const updateResult = freshTaskService.updateTask(originalTask.id, {
              description: newDescription,
              deadline: newDeadline
            });
            expect(updateResult.success).toBe(true);
            
            if (!updateResult.success) return;
            
            const updatedTask = updateResult.value;

            // Verify ID is maintained
            expect(updatedTask.id).toBe(originalTask.id);

            // Verify new values are applied
            expect(updatedTask.description).toBe(newDescription.trim());
            expect(updatedTask.deadline).toEqual(newDeadline);

            // Verify other properties remain unchanged
            expect(updatedTask.courseId).toBe(originalTask.courseId);
            expect(updatedTask.completed).toBe(originalTask.completed);
            expect(updatedTask.createdAt).toEqual(originalTask.createdAt);

            // Verify persistence
            const retrievedTask = freshTaskService.getTask(originalTask.id);
            expect(retrievedTask).not.toBeNull();
            expect(retrievedTask?.id).toBe(originalTask.id);
            expect(retrievedTask?.description).toBe(newDescription.trim());
            expect(retrievedTask?.deadline).toEqual(newDeadline);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should persist updates across service restarts', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 200 }).filter((s: string) => s.trim().length > 0),
          fc.date({ 
            min: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            max: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
          }),
          fc.string({ minLength: 1, maxLength: 200 }).filter((s: string) => s.trim().length > 0),
          (courseName: string, department: string, originalDescription: string, originalDeadline: Date, 
           newDescription: string) => {
            // Reset services for each test
            storage.clear();
            const freshStorageService = new StorageService(storage);
            const freshCourseService = new CourseService(freshStorageService);
            const freshTaskService = new TaskService(freshStorageService);

            // Create course and task
            const courseResult = freshCourseService.createCourse(courseName, department);
            expect(courseResult.success).toBe(true);
            
            if (!courseResult.success) return;
            
            const course = courseResult.value;

            const taskResult = freshTaskService.createTask(course.id, originalDescription, originalDeadline);
            expect(taskResult.success).toBe(true);
            
            if (!taskResult.success) return;
            
            const originalTask = taskResult.value;

            // Update task
            const updateResult = freshTaskService.updateTask(originalTask.id, {
              description: newDescription
            });
            expect(updateResult.success).toBe(true);

            // Simulate app restart
            const newStorageService = new StorageService(storage);
            const newTaskService = new TaskService(newStorageService);

            // Verify update persisted
            const retrievedTask = newTaskService.getTask(originalTask.id);
            expect(retrievedTask).not.toBeNull();
            expect(retrievedTask?.id).toBe(originalTask.id);
            expect(retrievedTask?.description).toBe(newDescription.trim());
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: weekly-course-tracker, Property 14: Task deletion**
   * **Validates: Requirements 5.2**
   * 
   * For any existing task, deleting it should result in the task no longer 
   * being retrievable from the system.
   */
  describe('Property 14: Task deletion', () => {
    it('should remove task from system after deletion', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 200 }).filter((s: string) => s.trim().length > 0),
          fc.date({ 
            min: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            max: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
          }),
          (courseName: string, department: string, taskDescription: string, deadline: Date) => {
            // Reset services for each test
            storage.clear();
            const freshStorageService = new StorageService(storage);
            const freshCourseService = new CourseService(freshStorageService);
            const freshTaskService = new TaskService(freshStorageService);

            // Create a course
            const courseResult = freshCourseService.createCourse(courseName, department);
            expect(courseResult.success).toBe(true);
            
            if (!courseResult.success) return;
            
            const course = courseResult.value;

            // Create a task
            const taskResult = freshTaskService.createTask(course.id, taskDescription, deadline);
            expect(taskResult.success).toBe(true);
            
            if (!taskResult.success) return;
            
            const task = taskResult.value;

            // Verify task exists
            const beforeDelete = freshTaskService.getTask(task.id);
            expect(beforeDelete).not.toBeNull();

            // Delete task
            const deleteResult = freshTaskService.deleteTask(task.id);
            expect(deleteResult.success).toBe(true);

            // Verify task no longer retrievable
            const afterDelete = freshTaskService.getTask(task.id);
            expect(afterDelete).toBeNull();

            // Verify task not in all tasks
            const allTasks = freshTaskService.getAllTasks();
            const foundInAll = allTasks.find(t => t.id === task.id);
            expect(foundInAll).toBeUndefined();

            // Verify task not in course tasks
            const courseTasks = freshTaskService.getTasksByCourse(course.id);
            const foundInCourse = courseTasks.find(t => t.id === task.id);
            expect(foundInCourse).toBeUndefined();

            // Verify task not in week view
            const taskWeek = getWeekNumber(deadline);
            const weekTasks = freshTaskService.getTasksForWeek(taskWeek.weekNumber, taskWeek.year);
            const foundInWeek = weekTasks.find(t => t.id === task.id);
            expect(foundInWeek).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should persist deletion across service restarts', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 200 }).filter((s: string) => s.trim().length > 0),
          fc.date({ 
            min: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            max: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
          }),
          (courseName: string, department: string, taskDescription: string, deadline: Date) => {
            // Reset services for each test
            storage.clear();
            const freshStorageService = new StorageService(storage);
            const freshCourseService = new CourseService(freshStorageService);
            const freshTaskService = new TaskService(freshStorageService);

            // Create course and task
            const courseResult = freshCourseService.createCourse(courseName, department);
            expect(courseResult.success).toBe(true);
            
            if (!courseResult.success) return;
            
            const course = courseResult.value;

            const taskResult = freshTaskService.createTask(course.id, taskDescription, deadline);
            expect(taskResult.success).toBe(true);
            
            if (!taskResult.success) return;
            
            const task = taskResult.value;

            // Delete task
            const deleteResult = freshTaskService.deleteTask(task.id);
            expect(deleteResult.success).toBe(true);

            // Simulate app restart
            const newStorageService = new StorageService(storage);
            const newTaskService = new TaskService(newStorageService);

            // Verify task still deleted
            const retrievedTask = newTaskService.getTask(task.id);
            expect(retrievedTask).toBeNull();

            // Verify not in all tasks
            const allTasks = newTaskService.getAllTasks();
            const foundInAll = allTasks.find(t => t.id === task.id);
            expect(foundInAll).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle deletion of multiple tasks correctly', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
          fc.array(
            fc.record({
              description: fc.string({ minLength: 1, maxLength: 200 }).filter((s: string) => s.trim().length > 0),
              deadline: fc.date({ 
                min: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                max: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
              })
            }),
            { minLength: 3, maxLength: 10 }
          ),
          (courseName: string, department: string, tasksData) => {
            // Reset services for each test
            storage.clear();
            const freshStorageService = new StorageService(storage);
            const freshCourseService = new CourseService(freshStorageService);
            const freshTaskService = new TaskService(freshStorageService);

            // Create course
            const courseResult = freshCourseService.createCourse(courseName, department);
            expect(courseResult.success).toBe(true);
            
            if (!courseResult.success) return;
            
            const course = courseResult.value;

            // Create tasks
            const createdTasks: Task[] = [];
            for (const taskData of tasksData) {
              const taskResult = freshTaskService.createTask(
                course.id,
                taskData.description,
                taskData.deadline
              );
              expect(taskResult.success).toBe(true);
              if (taskResult.success) {
                createdTasks.push(taskResult.value);
              }
            }

            // Delete every other task
            const deletedTasks: Task[] = [];
            const remainingTasks: Task[] = [];
            
            for (let i = 0; i < createdTasks.length; i++) {
              if (i % 2 === 0) {
                const deleteResult = freshTaskService.deleteTask(createdTasks[i].id);
                expect(deleteResult.success).toBe(true);
                deletedTasks.push(createdTasks[i]);
              } else {
                remainingTasks.push(createdTasks[i]);
              }
            }

            // Verify deleted tasks are not retrievable
            for (const deletedTask of deletedTasks) {
              const retrieved = freshTaskService.getTask(deletedTask.id);
              expect(retrieved).toBeNull();
            }

            // Verify remaining tasks are still retrievable
            for (const remainingTask of remainingTasks) {
              const retrieved = freshTaskService.getTask(remainingTask.id);
              expect(retrieved).not.toBeNull();
              expect(retrieved?.id).toBe(remainingTask.id);
            }

            // Verify all tasks count
            const allTasks = freshTaskService.getAllTasks();
            expect(allTasks.length).toBe(remainingTasks.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: weekly-course-tracker, Property 15: Deadline change triggers week reassignment**
   * **Validates: Requirements 5.4**
   * 
   * For any task, changing its deadline to a date in a different week should result 
   * in the task appearing in the new week's view and not in the old week's view.
   */
  describe('Property 15: Deadline change triggers week reassignment', () => {
    it('should move task to new week when deadline is changed', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 200 }).filter((s: string) => s.trim().length > 0),
          fc.integer({ min: 2020, max: 2030 }),
          fc.integer({ min: 1, max: 50 }),
          fc.integer({ min: 1, max: 50 }),
          (courseName: string, department: string, taskDescription: string, year: number, 
           week1: number, week2: number) => {
            // Ensure weeks are different
            if (week1 === week2) return;

            // Reset services for each test
            storage.clear();
            const freshStorageService = new StorageService(storage);
            const freshCourseService = new CourseService(freshStorageService);
            const freshTaskService = new TaskService(freshStorageService);

            // Create a course
            const courseResult = freshCourseService.createCourse(courseName, department);
            expect(courseResult.success).toBe(true);
            
            if (!courseResult.success) return;
            
            const course = courseResult.value;

            // Create deadline in week1
            const { startDate: week1Start } = getWeekBounds(week1, year);
            const originalDeadline = new Date(week1Start);
            originalDeadline.setDate(originalDeadline.getDate() + 2); // Mid-week

            // Create task
            const taskResult = freshTaskService.createTask(course.id, taskDescription, originalDeadline);
            expect(taskResult.success).toBe(true);
            
            if (!taskResult.success) return;
            
            const task = taskResult.value;

            // Verify task is in week1
            const tasksInWeek1Before = freshTaskService.getTasksForWeek(week1, year);
            const foundInWeek1Before = tasksInWeek1Before.find(t => t.id === task.id);
            expect(foundInWeek1Before).toBeDefined();

            // Verify task is NOT in week2
            const tasksInWeek2Before = freshTaskService.getTasksForWeek(week2, year);
            const foundInWeek2Before = tasksInWeek2Before.find(t => t.id === task.id);
            expect(foundInWeek2Before).toBeUndefined();

            // Change deadline to week2
            const { startDate: week2Start } = getWeekBounds(week2, year);
            const newDeadline = new Date(week2Start);
            newDeadline.setDate(newDeadline.getDate() + 3); // Mid-week

            const updateResult = freshTaskService.updateTask(task.id, {
              deadline: newDeadline
            });
            expect(updateResult.success).toBe(true);

            // Verify task is now in week2
            const tasksInWeek2After = freshTaskService.getTasksForWeek(week2, year);
            const foundInWeek2After = tasksInWeek2After.find(t => t.id === task.id);
            expect(foundInWeek2After).toBeDefined();
            expect(foundInWeek2After?.deadline).toEqual(newDeadline);

            // Verify task is NO LONGER in week1
            const tasksInWeek1After = freshTaskService.getTasksForWeek(week1, year);
            const foundInWeek1After = tasksInWeek1After.find(t => t.id === task.id);
            expect(foundInWeek1After).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle deadline changes across year boundaries', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 200 }).filter((s: string) => s.trim().length > 0),
          fc.integer({ min: 2020, max: 2029 }),
          (courseName: string, department: string, taskDescription: string, year: number) => {
            // Reset services for each test
            storage.clear();
            const freshStorageService = new StorageService(storage);
            const freshCourseService = new CourseService(freshStorageService);
            const freshTaskService = new TaskService(freshStorageService);

            // Create course
            const courseResult = freshCourseService.createCourse(courseName, department);
            expect(courseResult.success).toBe(true);
            
            if (!courseResult.success) return;
            
            const course = courseResult.value;

            // Create task in year 1
            const deadline1 = new Date(year, 0, 10); // Early January
            const taskResult = freshTaskService.createTask(course.id, taskDescription, deadline1);
            expect(taskResult.success).toBe(true);
            
            if (!taskResult.success) return;
            
            const task = taskResult.value;

            // Get week for year 1
            const week1 = getWeekNumber(deadline1);

            // Verify task is in year 1 week
            const tasksYear1Before = freshTaskService.getTasksForWeek(week1.weekNumber, week1.year);
            const foundYear1Before = tasksYear1Before.find(t => t.id === task.id);
            expect(foundYear1Before).toBeDefined();

            // Change deadline to year 2
            const deadline2 = new Date(year + 1, 0, 10); // Early January next year
            const updateResult = freshTaskService.updateTask(task.id, {
              deadline: deadline2
            });
            expect(updateResult.success).toBe(true);

            // Get week for year 2
            const week2 = getWeekNumber(deadline2);

            // Verify task is now in year 2 week
            const tasksYear2After = freshTaskService.getTasksForWeek(week2.weekNumber, week2.year);
            const foundYear2After = tasksYear2After.find(t => t.id === task.id);
            expect(foundYear2After).toBeDefined();

            // Verify task is NO LONGER in year 1 week
            const tasksYear1After = freshTaskService.getTasksForWeek(week1.weekNumber, week1.year);
            const foundYear1After = tasksYear1After.find(t => t.id === task.id);
            expect(foundYear1After).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: weekly-course-tracker, Property 16: Non-existent task error handling**
   * **Validates: Requirements 5.5**
   * 
   * For any non-existent task ID, attempting to update or delete that task should 
   * return an error rather than succeeding or crashing.
   */
  describe('Property 16: Non-existent task error handling', () => {
    it('should return error when updating non-existent task', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 200 }).filter((s: string) => s.trim().length > 0),
          fc.date({ 
            min: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            max: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
          }),
          (nonExistentId: string, newDescription: string, newDeadline: Date) => {
            // Reset services for each test
            storage.clear();
            const freshStorageService = new StorageService(storage);
            const freshTaskService = new TaskService(freshStorageService);

            // Attempt to update non-existent task
            const updateResult = freshTaskService.updateTask(nonExistentId, {
              description: newDescription,
              deadline: newDeadline
            });

            // Should fail gracefully
            expect(updateResult.success).toBe(false);
            
            if (!updateResult.success) {
              expect(updateResult.error).toBeDefined();
              expect(updateResult.error.message).toContain('not found');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return error when deleting non-existent task', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          (nonExistentId: string) => {
            // Reset services for each test
            storage.clear();
            const freshStorageService = new StorageService(storage);
            const freshTaskService = new TaskService(freshStorageService);

            // Attempt to delete non-existent task
            const deleteResult = freshTaskService.deleteTask(nonExistentId);

            // Should fail gracefully
            expect(deleteResult.success).toBe(false);
            
            if (!deleteResult.success) {
              expect(deleteResult.error).toBeDefined();
              expect(deleteResult.error.message).toContain('not found');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return error when marking non-existent task complete', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          (nonExistentId: string) => {
            // Reset services for each test
            storage.clear();
            const freshStorageService = new StorageService(storage);
            const freshTaskService = new TaskService(freshStorageService);

            // Attempt to mark non-existent task complete
            const completeResult = freshTaskService.markComplete(nonExistentId);

            // Should fail gracefully
            expect(completeResult.success).toBe(false);
            
            if (!completeResult.success) {
              expect(completeResult.error).toBeDefined();
              expect(completeResult.error.message).toContain('not found');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return error when marking non-existent task incomplete', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          (nonExistentId: string) => {
            // Reset services for each test
            storage.clear();
            const freshStorageService = new StorageService(storage);
            const freshTaskService = new TaskService(freshStorageService);

            // Attempt to mark non-existent task incomplete
            const incompleteResult = freshTaskService.markIncomplete(nonExistentId);

            // Should fail gracefully
            expect(incompleteResult.success).toBe(false);
            
            if (!incompleteResult.success) {
              expect(incompleteResult.error).toBeDefined();
              expect(incompleteResult.error.message).toContain('not found');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not crash or corrupt data when operating on non-existent tasks', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 200 }).filter((s: string) => s.trim().length > 0),
          fc.date({ 
            min: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            max: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
          }),
          fc.string({ minLength: 1, maxLength: 100 }),
          (courseName: string, department: string, taskDescription: string, deadline: Date, 
           nonExistentId: string) => {
            // Reset services for each test
            storage.clear();
            const freshStorageService = new StorageService(storage);
            const freshCourseService = new CourseService(freshStorageService);
            const freshTaskService = new TaskService(freshStorageService);

            // Create a real course and task
            const courseResult = freshCourseService.createCourse(courseName, department);
            expect(courseResult.success).toBe(true);
            
            if (!courseResult.success) return;
            
            const course = courseResult.value;

            const taskResult = freshTaskService.createTask(course.id, taskDescription, deadline);
            expect(taskResult.success).toBe(true);
            
            if (!taskResult.success) return;
            
            const realTask = taskResult.value;

            // Ensure non-existent ID is different from real task ID
            if (nonExistentId === realTask.id) return;

            // Attempt operations on non-existent task
            const updateResult = freshTaskService.updateTask(nonExistentId, {
              description: 'Updated'
            });
            expect(updateResult.success).toBe(false);

            const deleteResult = freshTaskService.deleteTask(nonExistentId);
            expect(deleteResult.success).toBe(false);

            const completeResult = freshTaskService.markComplete(nonExistentId);
            expect(completeResult.success).toBe(false);

            // Verify real task is unaffected
            const retrievedTask = freshTaskService.getTask(realTask.id);
            expect(retrievedTask).not.toBeNull();
            expect(retrievedTask?.id).toBe(realTask.id);
            expect(retrievedTask?.description).toBe(taskDescription.trim());
            expect(retrievedTask?.completed).toBe(false);

            // Verify system state is intact
            const allTasks = freshTaskService.getAllTasks();
            expect(allTasks.length).toBe(1);
            expect(allTasks[0].id).toBe(realTask.id);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});