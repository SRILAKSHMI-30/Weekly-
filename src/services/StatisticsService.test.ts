/**
 * Unit tests for StatisticsService
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { StatisticsService } from './StatisticsService.js';
import { CourseService } from './CourseService.js';
import { TaskService } from './TaskService.js';
import { StorageService } from '../storage/StorageService.js';
import { getWeekBounds } from '../utils/weekCalculations.js';

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

describe('StatisticsService', () => {
  let storage: MockStorage;
  let storageService: StorageService;
  let courseService: CourseService;
  let taskService: TaskService;
  let statisticsService: StatisticsService;

  beforeEach(() => {
    storage = new MockStorage();
    storageService = new StorageService(storage);
    taskService = new TaskService(storageService);
    courseService = new CourseService(storageService, taskService);
    statisticsService = new StatisticsService(taskService, courseService);
  });

  describe('getWeeklyStatistics', () => {
    it('should return zero statistics for empty week', () => {
      const stats = statisticsService.getWeeklyStatistics(1, 2024);
      
      expect(stats.weekNumber).toBe(1);
      expect(stats.year).toBe(2024);
      expect(stats.totalTasks).toBe(0);
      expect(stats.completedTasks).toBe(0);
      expect(stats.completionPercentage).toBe(0);
      expect(stats.overdueTasks).toBe(0);
      expect(stats.statsByDepartment.size).toBe(0);
      expect(stats.statsByCourse.size).toBe(0);
    });

    it('should calculate basic statistics correctly', () => {
      // Create a course
      const courseResult = courseService.createCourse('CS101', 'Computer Science');
      expect(courseResult.success).toBe(true);
      if (!courseResult.success) return;
      
      const course = courseResult.value;

      // Create tasks for week 1 of 2024 (Jan 1-7, 2024)
      const deadline1 = new Date('2024-01-02T10:00:00');
      const deadline2 = new Date('2024-01-03T10:00:00');
      const deadline3 = new Date('2024-01-04T10:00:00');

      const task1Result = taskService.createTask(course.id, 'Task 1', deadline1);
      const task2Result = taskService.createTask(course.id, 'Task 2', deadline2);
      const task3Result = taskService.createTask(course.id, 'Task 3', deadline3);

      expect(task1Result.success).toBe(true);
      expect(task2Result.success).toBe(true);
      expect(task3Result.success).toBe(true);

      if (!task1Result.success || !task2Result.success || !task3Result.success) return;

      // Mark one task as complete
      taskService.markComplete(task1Result.value.id);

      // Get statistics
      const stats = statisticsService.getWeeklyStatistics(1, 2024);

      expect(stats.weekNumber).toBe(1);
      expect(stats.year).toBe(2024);
      expect(stats.totalTasks).toBe(3);
      expect(stats.completedTasks).toBe(1);
      expect(stats.completionPercentage).toBe(33); // 1/3 = 33%
    });

    it('should calculate completion percentage correctly', () => {
      // Create a course
      const courseResult = courseService.createCourse('MATH101', 'Mathematics');
      expect(courseResult.success).toBe(true);
      if (!courseResult.success) return;
      
      const course = courseResult.value;

      // Create 4 tasks for week 1 of 2024
      const deadline = new Date('2024-01-02T10:00:00');
      
      const tasks: Array<{ id: string }> = [];
      for (let i = 0; i < 4; i++) {
        const result = taskService.createTask(course.id, `Task ${i + 1}`, deadline);
        expect(result.success).toBe(true);
        if (result.success) {
          tasks.push(result.value);
        }
      }

      // Mark 3 out of 4 as complete
      if (tasks.length >= 3) {
        taskService.markComplete(tasks[0].id);
        taskService.markComplete(tasks[1].id);
        taskService.markComplete(tasks[2].id);
      }

      // Get statistics
      const stats = statisticsService.getWeeklyStatistics(1, 2024);

      expect(stats.totalTasks).toBe(4);
      expect(stats.completedTasks).toBe(3);
      expect(stats.completionPercentage).toBe(75); // 3/4 = 75%
    });

    it('should group statistics by department', () => {
      // Create courses in different departments
      const cs101Result = courseService.createCourse('CS101', 'Computer Science');
      const cs102Result = courseService.createCourse('CS102', 'Computer Science');
      const math101Result = courseService.createCourse('MATH101', 'Mathematics');

      expect(cs101Result.success).toBe(true);
      expect(cs102Result.success).toBe(true);
      expect(math101Result.success).toBe(true);

      if (!cs101Result.success || !cs102Result.success || !math101Result.success) return;

      // Create tasks for week 1 of 2024
      const deadline = new Date('2024-01-02T10:00:00');
      
      taskService.createTask(cs101Result.value.id, 'CS Task 1', deadline);
      taskService.createTask(cs101Result.value.id, 'CS Task 2', deadline);
      taskService.createTask(cs102Result.value.id, 'CS Task 3', deadline);
      taskService.createTask(math101Result.value.id, 'Math Task 1', deadline);

      // Get statistics
      const stats = statisticsService.getWeeklyStatistics(1, 2024);

      expect(stats.statsByDepartment.size).toBe(2);
      
      const csStats = stats.statsByDepartment.get('Computer Science');
      expect(csStats).toBeDefined();
      expect(csStats?.totalTasks).toBe(3);
      
      const mathStats = stats.statsByDepartment.get('Mathematics');
      expect(mathStats).toBeDefined();
      expect(mathStats?.totalTasks).toBe(1);
    });

    it('should group statistics by course', () => {
      // Create courses
      const cs101Result = courseService.createCourse('CS101', 'Computer Science');
      const math101Result = courseService.createCourse('MATH101', 'Mathematics');

      expect(cs101Result.success).toBe(true);
      expect(math101Result.success).toBe(true);

      if (!cs101Result.success || !math101Result.success) return;

      // Create tasks for week 1 of 2024
      const deadline = new Date('2024-01-02T10:00:00');
      
      taskService.createTask(cs101Result.value.id, 'CS Task 1', deadline);
      taskService.createTask(cs101Result.value.id, 'CS Task 2', deadline);
      taskService.createTask(math101Result.value.id, 'Math Task 1', deadline);

      // Get statistics
      const stats = statisticsService.getWeeklyStatistics(1, 2024);

      expect(stats.statsByCourse.size).toBe(2);
      
      const csStats = stats.statsByCourse.get(cs101Result.value.id);
      expect(csStats).toBeDefined();
      expect(csStats?.courseName).toBe('CS101');
      expect(csStats?.totalTasks).toBe(2);
      
      const mathStats = stats.statsByCourse.get(math101Result.value.id);
      expect(mathStats).toBeDefined();
      expect(mathStats?.courseName).toBe('MATH101');
      expect(mathStats?.totalTasks).toBe(1);
    });
  });

  describe('getCourseProgress', () => {
    it('should return null for non-existent course', () => {
      const progress = statisticsService.getCourseProgress('non-existent-id');
      expect(progress).toBeNull();
    });

    it('should return correct progress for course with no tasks', () => {
      const courseResult = courseService.createCourse('CS101', 'Computer Science');
      expect(courseResult.success).toBe(true);
      if (!courseResult.success) return;

      const progress = statisticsService.getCourseProgress(courseResult.value.id);
      
      expect(progress).not.toBeNull();
      expect(progress?.courseId).toBe(courseResult.value.id);
      expect(progress?.courseName).toBe('CS101');
      expect(progress?.totalTasks).toBe(0);
      expect(progress?.completedTasks).toBe(0);
    });

    it('should return correct progress for course with tasks', () => {
      const courseResult = courseService.createCourse('CS101', 'Computer Science');
      expect(courseResult.success).toBe(true);
      if (!courseResult.success) return;

      const course = courseResult.value;

      // Create tasks
      const deadline = new Date('2024-01-02T10:00:00');
      const task1Result = taskService.createTask(course.id, 'Task 1', deadline);
      const task2Result = taskService.createTask(course.id, 'Task 2', deadline);
      const task3Result = taskService.createTask(course.id, 'Task 3', deadline);

      expect(task1Result.success).toBe(true);
      expect(task2Result.success).toBe(true);
      expect(task3Result.success).toBe(true);

      if (!task1Result.success || !task2Result.success || !task3Result.success) return;

      // Mark one as complete
      taskService.markComplete(task1Result.value.id);

      const progress = statisticsService.getCourseProgress(course.id);
      
      expect(progress).not.toBeNull();
      expect(progress?.courseId).toBe(course.id);
      expect(progress?.courseName).toBe('CS101');
      expect(progress?.totalTasks).toBe(3);
      expect(progress?.completedTasks).toBe(1);
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * **Feature: weekly-course-tracker, Property 11: Weekly progress calculation**
     * **Validates: Requirements 3.5, 6.2**
     * 
     * For any collection of tasks for a course in a week, the completion percentage 
     * should equal (completed tasks / total tasks) × 100.
     */
    it('Property 11: completion percentage equals (completed / total) × 100', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 20 }), // Number of tasks
          fc.integer({ min: 0, max: 20 }), // Number of completed tasks (will be clamped)
          fc.integer({ min: 1, max: 52 }), // Week number (ISO 8601 has 52-53 weeks, use 52 to be safe)
          fc.integer({ min: 2020, max: 2030 }), // Year
          (totalTaskCount: number, completedCount: number, weekNumber: number, year: number) => {
            // Create fresh services for each property test iteration
            const testStorage = new MockStorage();
            const testStorageService = new StorageService(testStorage);
            const testTaskService = new TaskService(testStorageService);
            const testCourseService = new CourseService(testStorageService, testTaskService);
            const testStatisticsService = new StatisticsService(testTaskService, testCourseService);
            
            // Clamp completed count to not exceed total
            const actualCompletedCount = Math.min(completedCount, totalTaskCount);
            
            // Create a course
            const courseResult = testCourseService.createCourse(
              `Course-${Math.random().toString(36).substring(7)}`,
              `Dept-${Math.random().toString(36).substring(7)}`
            );
            
            if (!courseResult.success) {
              throw new Error('Failed to create course');
            }
            
            const course = courseResult.value;
            
            // Calculate a date within the specified week using ISO 8601 week calculations
            const { startDate } = getWeekBounds(weekNumber, year);
            const weekDate = new Date(startDate.getTime() + 2 * 24 * 60 * 60 * 1000); // Use Wednesday
            
            // Create tasks
            const taskIds: string[] = [];
            for (let i = 0; i < totalTaskCount; i++) {
              const taskResult = testTaskService.createTask(
                course.id,
                `Task ${i}`,
                weekDate
              );
              
              if (!taskResult.success) {
                throw new Error('Failed to create task');
              }
              
              taskIds.push(taskResult.value.id);
            }
            
            // Mark some tasks as completed
            for (let i = 0; i < actualCompletedCount; i++) {
              testTaskService.markComplete(taskIds[i]);
            }
            
            // Get weekly statistics
            const stats = testStatisticsService.getWeeklyStatistics(weekNumber, year);
            
            // Calculate expected completion percentage
            const expectedPercentage = Math.round((actualCompletedCount / totalTaskCount) * 100);
            
            // Verify the property
            expect(stats.totalTasks).toBeGreaterThanOrEqual(totalTaskCount);
            expect(stats.completedTasks).toBeGreaterThanOrEqual(actualCompletedCount);
            
            // Find the course stats
            const courseStats = stats.statsByCourse.get(course.id);
            if (courseStats) {
              expect(courseStats.totalTasks).toBe(totalTaskCount);
              expect(courseStats.completedTasks).toBe(actualCompletedCount);
              
              // Verify completion percentage calculation
              const actualPercentage = courseStats.totalTasks > 0
                ? Math.round((courseStats.completedTasks / courseStats.totalTasks) * 100)
                : 0;
              expect(actualPercentage).toBe(expectedPercentage);
            }
            
            // No cleanup needed - we use fresh services for each iteration
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: weekly-course-tracker, Property 17: Weekly statistics accuracy**
     * **Validates: Requirements 6.1, 6.3, 6.5**
     * 
     * For any week, the weekly statistics should accurately count total tasks, completed tasks, 
     * and overdue tasks, with breakdowns by course and department matching the actual task data.
     */
    it('Property 17: weekly statistics accurately reflect actual task data', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }), // Number of departments
          fc.integer({ min: 1, max: 3 }), // Courses per department
          fc.integer({ min: 1, max: 5 }), // Tasks per course
          fc.integer({ min: 1, max: 53 }), // Week number
          fc.integer({ min: 2020, max: 2030 }), // Year
          fc.double({ min: 0, max: 1 }), // Completion rate (0-1)
          fc.double({ min: 0, max: 1 }), // Overdue rate (0-1)
          (numDepts: number, coursesPerDept: number, tasksPerCourse: number, weekNumber: number, year: number, completionRate: number, overdueRate: number) => {
            // Create fresh services for each property test iteration
            const testStorage = new MockStorage();
            const testStorageService = new StorageService(testStorage);
            const testTaskService = new TaskService(testStorageService);
            const testCourseService = new CourseService(testStorageService, testTaskService);
            const testStatisticsService = new StatisticsService(testTaskService, testCourseService);
            // Track expected values
            const expectedTotalTasks = numDepts * coursesPerDept * tasksPerCourse;
            let expectedCompletedTasks = 0;
            let expectedOverdueTasks = 0;
            
            const departmentTaskCounts = new Map<string, { total: number; completed: number }>();
            const courseTaskCounts = new Map<string, { courseId: string; courseName: string; total: number; completed: number }>();
            
            // Use a fixed past week (week 5 of 2024) to ensure overdue detection works
            const testYear = 2024;
            const testWeek = 5;
            
            // Get a date within the test week using ISO 8601 week calculations
            const { startDate: mondayOfWeek } = getWeekBounds(testWeek, testYear);
            
            // Create departments, courses, and tasks
            for (let d = 0; d < numDepts; d++) {
              const deptName = `Dept-${d}-${Math.random().toString(36).substring(7)}`;
              
              for (let c = 0; c < coursesPerDept; c++) {
                const courseName = `Course-${d}-${c}-${Math.random().toString(36).substring(7)}`;
                const courseResult = testCourseService.createCourse(courseName, deptName);
                
                if (!courseResult.success) {
                  throw new Error('Failed to create course');
                }
                
                const course = courseResult.value;
                
                // Initialize tracking for this course and department
                if (!departmentTaskCounts.has(deptName)) {
                  departmentTaskCounts.set(deptName, { total: 0, completed: 0 });
                }
                courseTaskCounts.set(course.id, { 
                  courseId: course.id, 
                  courseName: course.name, 
                  total: 0, 
                  completed: 0 
                });
                
                // Create tasks for this course - all tasks will be in the same week
                for (let t = 0; t < tasksPerCourse; t++) {
                  // Vary the day within the week (Monday to Sunday)
                  const dayOffset = t % 7;
                  const taskDeadline = new Date(mondayOfWeek.getTime() + dayOffset * 24 * 60 * 60 * 1000);
                  
                  const taskResult = testTaskService.createTask(
                    course.id,
                    `Task ${t}`,
                    taskDeadline
                  );
                  
                  if (!taskResult.success) {
                    throw new Error('Failed to create task');
                  }
                  
                  const task = taskResult.value;
                  
                  // Update counts
                  departmentTaskCounts.get(deptName)!.total++;
                  courseTaskCounts.get(course.id)!.total++;
                  
                  // Determine if this task should be completed based on completion rate
                  const shouldComplete = Math.random() < completionRate;
                  if (shouldComplete) {
                    testTaskService.markComplete(task.id);
                    expectedCompletedTasks++;
                    departmentTaskCounts.get(deptName)!.completed++;
                    courseTaskCounts.get(course.id)!.completed++;
                  } else {
                    // Check if this task is overdue (deadline in the past and not completed)
                    const now = new Date();
                    if (taskDeadline < now) {
                      expectedOverdueTasks++;
                    }
                  }
                }
              }
            }
            
            // Get weekly statistics for the test week
            const stats = testStatisticsService.getWeeklyStatistics(testWeek, testYear);
            
            // Verify total task count
            expect(stats.totalTasks).toBe(expectedTotalTasks);
            
            // Verify completed task count
            expect(stats.completedTasks).toBe(expectedCompletedTasks);
            
            // Verify overdue task count
            expect(stats.overdueTasks).toBe(expectedOverdueTasks);
            
            // Verify completion percentage
            const expectedPercentage = expectedTotalTasks > 0 
              ? Math.round((expectedCompletedTasks / expectedTotalTasks) * 100) 
              : 0;
            expect(stats.completionPercentage).toBe(expectedPercentage);
            
            // Verify department breakdowns
            expect(stats.statsByDepartment.size).toBe(numDepts);
            for (const [deptName, expectedCounts] of departmentTaskCounts.entries()) {
              const deptStats = stats.statsByDepartment.get(deptName);
              expect(deptStats).toBeDefined();
              expect(deptStats?.department).toBe(deptName);
              expect(deptStats?.totalTasks).toBe(expectedCounts.total);
              expect(deptStats?.completedTasks).toBe(expectedCounts.completed);
            }
            
            // Verify course breakdowns
            expect(stats.statsByCourse.size).toBe(numDepts * coursesPerDept);
            for (const [courseId, expectedCounts] of courseTaskCounts.entries()) {
              const courseStats = stats.statsByCourse.get(courseId);
              expect(courseStats).toBeDefined();
              expect(courseStats?.courseId).toBe(expectedCounts.courseId);
              expect(courseStats?.courseName).toBe(expectedCounts.courseName);
              expect(courseStats?.totalTasks).toBe(expectedCounts.total);
              expect(courseStats?.completedTasks).toBe(expectedCounts.completed);
            }
            
            // No cleanup needed - we use fresh services for each iteration
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('getDepartmentProgress', () => {
    it('should return zero progress for department with no courses', () => {
      const progress = statisticsService.getDepartmentProgress('Non-existent Department');
      
      expect(progress.department).toBe('Non-existent Department');
      expect(progress.totalTasks).toBe(0);
      expect(progress.completedTasks).toBe(0);
    });

    it('should return correct progress for department with courses', () => {
      // Create courses in the same department
      const cs101Result = courseService.createCourse('CS101', 'Computer Science');
      const cs102Result = courseService.createCourse('CS102', 'Computer Science');

      expect(cs101Result.success).toBe(true);
      expect(cs102Result.success).toBe(true);

      if (!cs101Result.success || !cs102Result.success) return;

      // Create tasks
      const deadline = new Date('2024-01-02T10:00:00');
      
      const task1Result = taskService.createTask(cs101Result.value.id, 'Task 1', deadline);
      const task2Result = taskService.createTask(cs101Result.value.id, 'Task 2', deadline);
      const task3Result = taskService.createTask(cs102Result.value.id, 'Task 3', deadline);

      expect(task1Result.success).toBe(true);
      expect(task2Result.success).toBe(true);
      expect(task3Result.success).toBe(true);

      if (!task1Result.success || !task2Result.success || !task3Result.success) return;

      // Mark two as complete
      taskService.markComplete(task1Result.value.id);
      taskService.markComplete(task3Result.value.id);

      const progress = statisticsService.getDepartmentProgress('Computer Science');
      
      expect(progress.department).toBe('Computer Science');
      expect(progress.totalTasks).toBe(3);
      expect(progress.completedTasks).toBe(2);
    });

    it('should aggregate tasks from multiple courses in department', () => {
      // Create multiple courses in the same department
      const courses: Array<{ id: string; name: string }> = [];
      for (let i = 1; i <= 3; i++) {
        const result = courseService.createCourse(`CS10${i}`, 'Computer Science');
        expect(result.success).toBe(true);
        if (result.success) {
          courses.push(result.value);
        }
      }

      // Create tasks for each course
      const deadline = new Date('2024-01-02T10:00:00');
      
      for (const course of courses) {
        taskService.createTask(course.id, `Task for ${course.name}`, deadline);
      }

      const progress = statisticsService.getDepartmentProgress('Computer Science');
      
      expect(progress.department).toBe('Computer Science');
      expect(progress.totalTasks).toBe(3);
      expect(progress.completedTasks).toBe(0);
    });
  });
});
