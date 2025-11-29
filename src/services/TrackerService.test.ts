/**
 * TrackerService tests - Integration tests for the main application coordinator
 * Requirements: All
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TrackerService } from './TrackerService.js';
import { StorageService } from '../storage/StorageService.js';
import { getWeekBounds } from '../utils/weekCalculations.js';

describe('TrackerService', () => {
  let trackerService: TrackerService;
  let mockStorage: Map<string, string>;

  beforeEach(() => {
    // Create a mock storage implementation
    mockStorage = new Map<string, string>();
    const storage = {
      getItem: (key: string) => mockStorage.get(key) || null,
      setItem: (key: string, value: string) => mockStorage.set(key, value),
      removeItem: (key: string) => mockStorage.delete(key),
      clear: () => mockStorage.clear(),
      length: mockStorage.size,
      key: (index: number) => Array.from(mockStorage.keys())[index] || null
    } as Storage;

    trackerService = new TrackerService(storage);
    trackerService.initialize();
  });

  describe('Initialization', () => {
    it('should initialize without errors', () => {
      expect(() => trackerService.initialize()).not.toThrow();
    });
  });

  describe('Course Operations', () => {
    it('should create a course', () => {
      const result = trackerService.createCourse('CS101', 'Computer Science');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.name).toBe('CS101');
        expect(result.value.department).toBe('Computer Science');
        expect(result.value.id).toBeDefined();
      }
    });

    it('should get a course by ID', () => {
      const createResult = trackerService.createCourse('CS101', 'Computer Science');
      expect(createResult.success).toBe(true);
      
      if (createResult.success) {
        const course = trackerService.getCourse(createResult.value.id);
        expect(course).not.toBeNull();
        expect(course?.name).toBe('CS101');
      }
    });

    it('should get all courses', () => {
      trackerService.createCourse('CS101', 'Computer Science');
      trackerService.createCourse('MATH201', 'Mathematics');
      
      const courses = trackerService.getAllCourses();
      expect(courses.length).toBe(2);
    });

    it('should group courses by department', () => {
      trackerService.createCourse('CS101', 'Computer Science');
      trackerService.createCourse('CS102', 'Computer Science');
      trackerService.createCourse('MATH201', 'Mathematics');
      
      const grouped = trackerService.getCoursesByDepartment();
      expect(grouped.size).toBe(2);
      expect(grouped.get('Computer Science')?.length).toBe(2);
      expect(grouped.get('Mathematics')?.length).toBe(1);
    });

    it('should update a course', () => {
      const createResult = trackerService.createCourse('CS101', 'Computer Science');
      expect(createResult.success).toBe(true);
      
      if (createResult.success) {
        const updateResult = trackerService.updateCourse(createResult.value.id, {
          name: 'CS102'
        });
        
        expect(updateResult.success).toBe(true);
        if (updateResult.success) {
          expect(updateResult.value.name).toBe('CS102');
        }
      }
    });

    it('should delete a course without tasks', () => {
      const createResult = trackerService.createCourse('CS101', 'Computer Science');
      expect(createResult.success).toBe(true);
      
      if (createResult.success) {
        const deleteResult = trackerService.deleteCourse(createResult.value.id);
        expect(deleteResult.success).toBe(true);
        
        const course = trackerService.getCourse(createResult.value.id);
        expect(course).toBeNull();
      }
    });

    it('should prevent deleting a course with tasks without strategy', () => {
      const courseResult = trackerService.createCourse('CS101', 'Computer Science');
      expect(courseResult.success).toBe(true);
      
      if (courseResult.success) {
        const taskResult = trackerService.createTask(
          courseResult.value.id,
          'Assignment 1',
          new Date('2024-12-31')
        );
        expect(taskResult.success).toBe(true);
        
        const deleteResult = trackerService.deleteCourse(courseResult.value.id);
        expect(deleteResult.success).toBe(false);
      }
    });

    it('should cascade delete course with tasks', () => {
      const courseResult = trackerService.createCourse('CS101', 'Computer Science');
      expect(courseResult.success).toBe(true);
      
      if (courseResult.success) {
        const taskResult = trackerService.createTask(
          courseResult.value.id,
          'Assignment 1',
          new Date('2024-12-31')
        );
        expect(taskResult.success).toBe(true);
        
        const deleteResult = trackerService.deleteCourse(courseResult.value.id, 'cascade');
        expect(deleteResult.success).toBe(true);
        
        const course = trackerService.getCourse(courseResult.value.id);
        expect(course).toBeNull();
        
        if (taskResult.success) {
          const task = trackerService.getTask(taskResult.value.id);
          expect(task).toBeNull();
        }
      }
    });
  });

  describe('Task Operations', () => {
    let courseId: string;

    beforeEach(() => {
      const result = trackerService.createCourse('CS101', 'Computer Science');
      if (result.success) {
        courseId = result.value.id;
      }
    });

    it('should create a task', () => {
      const result = trackerService.createTask(
        courseId,
        'Assignment 1',
        new Date('2024-12-31')
      );
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.description).toBe('Assignment 1');
        expect(result.value.courseId).toBe(courseId);
        expect(result.value.completed).toBe(false);
      }
    });

    it('should validate course exists when creating task', () => {
      const result = trackerService.createTask(
        'non-existent-id',
        'Assignment 1',
        new Date('2024-12-31')
      );
      
      expect(result.success).toBe(false);
    });

    it('should get tasks by course', () => {
      trackerService.createTask(courseId, 'Assignment 1', new Date('2024-12-31'));
      trackerService.createTask(courseId, 'Assignment 2', new Date('2024-12-31'));
      
      const tasks = trackerService.getTasksByCourse(courseId);
      expect(tasks.length).toBe(2);
    });

    it('should mark task as complete', () => {
      const createResult = trackerService.createTask(
        courseId,
        'Assignment 1',
        new Date('2024-12-31')
      );
      expect(createResult.success).toBe(true);
      
      if (createResult.success) {
        const completeResult = trackerService.markTaskComplete(createResult.value.id);
        expect(completeResult.success).toBe(true);
        
        if (completeResult.success) {
          expect(completeResult.value.completed).toBe(true);
          expect(completeResult.value.completedAt).toBeDefined();
        }
      }
    });

    it('should mark task as incomplete', () => {
      const createResult = trackerService.createTask(
        courseId,
        'Assignment 1',
        new Date('2024-12-31')
      );
      expect(createResult.success).toBe(true);
      
      if (createResult.success) {
        trackerService.markTaskComplete(createResult.value.id);
        const incompleteResult = trackerService.markTaskIncomplete(createResult.value.id);
        
        expect(incompleteResult.success).toBe(true);
        if (incompleteResult.success) {
          expect(incompleteResult.value.completed).toBe(false);
          expect(incompleteResult.value.completedAt).toBeUndefined();
        }
      }
    });

    it('should get overdue tasks', () => {
      const pastDate = new Date('2020-01-01');
      trackerService.createTask(courseId, 'Overdue Task', pastDate);
      
      const overdueTasks = trackerService.getOverdueTasks();
      expect(overdueTasks.length).toBe(1);
    });

    it('should validate course exists when updating task', () => {
      const createResult = trackerService.createTask(
        courseId,
        'Assignment 1',
        new Date('2024-12-31')
      );
      expect(createResult.success).toBe(true);
      
      if (createResult.success) {
        const updateResult = trackerService.updateTask(createResult.value.id, {
          courseId: 'non-existent-id'
        });
        
        expect(updateResult.success).toBe(false);
      }
    });
  });

  describe('Statistics Operations', () => {
    let courseId: string;

    beforeEach(() => {
      const result = trackerService.createCourse('CS101', 'Computer Science');
      if (result.success) {
        courseId = result.value.id;
      }
    });

    it('should get weekly statistics', () => {
      const deadline = new Date('2024-12-31');
      trackerService.createTask(courseId, 'Task 1', deadline);
      trackerService.createTask(courseId, 'Task 2', deadline);
      
      const stats = trackerService.getWeeklyStatistics(1, 2025);
      expect(stats).toBeDefined();
      expect(stats.weekNumber).toBe(1);
      expect(stats.year).toBe(2025);
    });

    it('should get course progress', () => {
      trackerService.createTask(courseId, 'Task 1', new Date('2024-12-31'));
      const createResult = trackerService.createTask(courseId, 'Task 2', new Date('2024-12-31'));
      
      if (createResult.success) {
        trackerService.markTaskComplete(createResult.value.id);
      }
      
      const progress = trackerService.getCourseProgress(courseId);
      expect(progress).not.toBeNull();
      if (progress) {
        expect(progress.totalTasks).toBe(2);
        expect(progress.completedTasks).toBe(1);
      }
    });

    it('should get department progress', () => {
      trackerService.createTask(courseId, 'Task 1', new Date('2024-12-31'));
      
      const progress = trackerService.getDepartmentProgress('Computer Science');
      expect(progress).toBeDefined();
      expect(progress.department).toBe('Computer Science');
      expect(progress.totalTasks).toBe(1);
    });
  });

  describe('Integration Tests - Complete Workflows', () => {
    it('should handle complete workflow: create course → add tasks → mark complete → view statistics', () => {
      // Create course
      const courseResult = trackerService.createCourse('CS101', 'Computer Science');
      expect(courseResult.success).toBe(true);
      
      if (courseResult.success) {
        const courseId = courseResult.value.id;
        
        // Add tasks
        const task1Result = trackerService.createTask(courseId, 'Assignment 1', new Date('2024-12-31'));
        const task2Result = trackerService.createTask(courseId, 'Assignment 2', new Date('2024-12-31'));
        expect(task1Result.success).toBe(true);
        expect(task2Result.success).toBe(true);
        
        // Mark one complete
        if (task1Result.success) {
          const completeResult = trackerService.markTaskComplete(task1Result.value.id);
          expect(completeResult.success).toBe(true);
        }
        
        // View statistics
        const progress = trackerService.getCourseProgress(courseId);
        expect(progress).not.toBeNull();
        if (progress) {
          expect(progress.totalTasks).toBe(2);
          expect(progress.completedTasks).toBe(1);
        }
      }
    });

    it('should handle multi-course workflow with department statistics', () => {
      // Create multiple courses in different departments
      const cs101Result = trackerService.createCourse('CS101', 'Computer Science');
      const cs102Result = trackerService.createCourse('CS102', 'Computer Science');
      const math201Result = trackerService.createCourse('MATH201', 'Mathematics');
      
      expect(cs101Result.success).toBe(true);
      expect(cs102Result.success).toBe(true);
      expect(math201Result.success).toBe(true);
      
      if (cs101Result.success && cs102Result.success && math201Result.success) {
        // Add tasks to each course
        const deadline = new Date('2024-12-31');
        const task1 = trackerService.createTask(cs101Result.value.id, 'CS101 Task 1', deadline);
        const task2 = trackerService.createTask(cs101Result.value.id, 'CS101 Task 2', deadline);
        const task3 = trackerService.createTask(cs102Result.value.id, 'CS102 Task 1', deadline);
        const task4 = trackerService.createTask(math201Result.value.id, 'MATH201 Task 1', deadline);
        
        expect(task1.success).toBe(true);
        expect(task2.success).toBe(true);
        expect(task3.success).toBe(true);
        expect(task4.success).toBe(true);
        
        // Mark some tasks complete
        if (task1.success) trackerService.markTaskComplete(task1.value.id);
        if (task3.success) trackerService.markTaskComplete(task3.value.id);
        if (task4.success) trackerService.markTaskComplete(task4.value.id);
        
        // Check department statistics
        const csProgress = trackerService.getDepartmentProgress('Computer Science');
        expect(csProgress.totalTasks).toBe(3);
        expect(csProgress.completedTasks).toBe(2);
        
        const mathProgress = trackerService.getDepartmentProgress('Mathematics');
        expect(mathProgress.totalTasks).toBe(1);
        expect(mathProgress.completedTasks).toBe(1);
        
        // Check course grouping
        const grouped = trackerService.getCoursesByDepartment();
        expect(grouped.get('Computer Science')?.length).toBe(2);
        expect(grouped.get('Mathematics')?.length).toBe(1);
      }
    });

    it('should handle task completion round-trip workflow', () => {
      const courseResult = trackerService.createCourse('CS101', 'Computer Science');
      expect(courseResult.success).toBe(true);
      
      if (courseResult.success) {
        const taskResult = trackerService.createTask(
          courseResult.value.id,
          'Assignment 1',
          new Date('2024-12-31')
        );
        expect(taskResult.success).toBe(true);
        
        if (taskResult.success) {
          const taskId = taskResult.value.id;
          
          // Mark complete
          const completeResult = trackerService.markTaskComplete(taskId);
          expect(completeResult.success).toBe(true);
          if (completeResult.success) {
            expect(completeResult.value.completed).toBe(true);
            expect(completeResult.value.completedAt).toBeDefined();
          }
          
          // Mark incomplete
          const incompleteResult = trackerService.markTaskIncomplete(taskId);
          expect(incompleteResult.success).toBe(true);
          if (incompleteResult.success) {
            expect(incompleteResult.value.completed).toBe(false);
            expect(incompleteResult.value.completedAt).toBeUndefined();
          }
          
          // Mark complete again
          const recompleteResult = trackerService.markTaskComplete(taskId);
          expect(recompleteResult.success).toBe(true);
          if (recompleteResult.success) {
            expect(recompleteResult.value.completed).toBe(true);
          }
        }
      }
    });

    it('should handle task update workflow with week reassignment', () => {
      const courseResult = trackerService.createCourse('CS101', 'Computer Science');
      expect(courseResult.success).toBe(true);
      
      if (courseResult.success) {
        // Create task in week 2 of 2024 (use a known good week)
        const { startDate: week2Start } = getWeekBounds(2, 2024);
        const taskResult = trackerService.createTask(
          courseResult.value.id,
          'Assignment 1',
          week2Start
        );
        expect(taskResult.success).toBe(true);
        
        if (taskResult.success) {
          const taskId = taskResult.value.id;
          
          // Verify task is in week 2
          const week2Tasks = trackerService.getTasksForWeek(2, 2024);
          expect(week2Tasks.length).toBe(1);
          expect(week2Tasks[0].id).toBe(taskId);
          
          // Update deadline to week 3
          const { startDate: week3Start } = getWeekBounds(3, 2024);
          const updateResult = trackerService.updateTask(taskId, { deadline: week3Start });
          expect(updateResult.success).toBe(true);
          
          // Verify task moved to week 3
          const week2TasksAfter = trackerService.getTasksForWeek(2, 2024);
          expect(week2TasksAfter.length).toBe(0);
          
          const week3Tasks = trackerService.getTasksForWeek(3, 2024);
          expect(week3Tasks.length).toBe(1);
          expect(week3Tasks[0].id).toBe(taskId);
        }
      }
    });

    it('should handle persistence workflow: save and reload', () => {
      // Create data
      const courseResult = trackerService.createCourse('CS101', 'Computer Science');
      expect(courseResult.success).toBe(true);
      
      if (courseResult.success) {
        const taskResult = trackerService.createTask(
          courseResult.value.id,
          'Assignment 1',
          new Date('2024-12-31')
        );
        expect(taskResult.success).toBe(true);
        
        if (taskResult.success) {
          trackerService.markTaskComplete(taskResult.value.id);
        }
        
        // Create new tracker instance with same underlying storage
        const newStorage = {
          getItem: (key: string) => mockStorage.get(key) || null,
          setItem: (key: string, value: string) => mockStorage.set(key, value),
          removeItem: (key: string) => mockStorage.delete(key),
          clear: () => mockStorage.clear(),
          length: mockStorage.size,
          key: (index: number) => Array.from(mockStorage.keys())[index] || null
        } as Storage;
        
        const newTracker = new TrackerService(newStorage);
        newTracker.initialize();
        
        // Verify data persisted
        const courses = newTracker.getAllCourses();
        expect(courses.length).toBe(1);
        expect(courses[0].name).toBe('CS101');
        
        const tasks = newTracker.getAllTasks();
        expect(tasks.length).toBe(1);
        expect(tasks[0].description).toBe('Assignment 1');
        expect(tasks[0].completed).toBe(true);
      }
    });
  });

  describe('Integration Tests - Error Scenarios', () => {
    it('should handle error when creating task for non-existent course', () => {
      const result = trackerService.createTask(
        'non-existent-course-id',
        'Assignment 1',
        new Date('2024-12-31')
      );
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('not found');
      }
    });

    it('should handle error when updating task with non-existent course', () => {
      const courseResult = trackerService.createCourse('CS101', 'Computer Science');
      expect(courseResult.success).toBe(true);
      
      if (courseResult.success) {
        const taskResult = trackerService.createTask(
          courseResult.value.id,
          'Assignment 1',
          new Date('2024-12-31')
        );
        expect(taskResult.success).toBe(true);
        
        if (taskResult.success) {
          const updateResult = trackerService.updateTask(taskResult.value.id, {
            courseId: 'non-existent-course-id'
          });
          
          expect(updateResult.success).toBe(false);
          if (!updateResult.success) {
            expect(updateResult.error.message).toContain('not found');
          }
        }
      }
    });

    it('should handle error when deleting course with tasks without strategy', () => {
      const courseResult = trackerService.createCourse('CS101', 'Computer Science');
      expect(courseResult.success).toBe(true);
      
      if (courseResult.success) {
        const taskResult = trackerService.createTask(
          courseResult.value.id,
          'Assignment 1',
          new Date('2024-12-31')
        );
        expect(taskResult.success).toBe(true);
        
        const deleteResult = trackerService.deleteCourse(courseResult.value.id);
        expect(deleteResult.success).toBe(false);
        if (!deleteResult.success) {
          expect(deleteResult.error.message).toContain('associated tasks');
        }
        
        // Verify course and task still exist
        const course = trackerService.getCourse(courseResult.value.id);
        expect(course).not.toBeNull();
        
        if (taskResult.success) {
          const task = trackerService.getTask(taskResult.value.id);
          expect(task).not.toBeNull();
        }
      }
    });

    it('should handle validation errors across service boundaries', () => {
      // Try to create course with empty name
      const courseResult = trackerService.createCourse('   ', 'Computer Science');
      expect(courseResult.success).toBe(false);
      
      // Create valid course
      const validCourseResult = trackerService.createCourse('CS101', 'Computer Science');
      expect(validCourseResult.success).toBe(true);
      
      if (validCourseResult.success) {
        // Try to create task with empty description
        const taskResult = trackerService.createTask(
          validCourseResult.value.id,
          '   ',
          new Date('2024-12-31')
        );
        expect(taskResult.success).toBe(false);
      }
    });

    it('should handle duplicate course creation error', () => {
      const result1 = trackerService.createCourse('CS101', 'Computer Science');
      expect(result1.success).toBe(true);
      
      const result2 = trackerService.createCourse('CS101', 'Computer Science');
      expect(result2.success).toBe(false);
      if (!result2.success) {
        expect(result2.error.message).toContain('already exists');
      }
      
      // Verify only one course exists
      const courses = trackerService.getAllCourses();
      expect(courses.length).toBe(1);
    });

    it('should handle operations on deleted entities', () => {
      const courseResult = trackerService.createCourse('CS101', 'Computer Science');
      expect(courseResult.success).toBe(true);
      
      if (courseResult.success) {
        const courseId = courseResult.value.id;
        
        // Delete course
        const deleteResult = trackerService.deleteCourse(courseId);
        expect(deleteResult.success).toBe(true);
        
        // Try to create task for deleted course
        const taskResult = trackerService.createTask(
          courseId,
          'Assignment 1',
          new Date('2024-12-31')
        );
        expect(taskResult.success).toBe(false);
        
        // Try to update deleted course
        const updateResult = trackerService.updateCourse(courseId, { name: 'CS102' });
        expect(updateResult.success).toBe(false);
      }
    });

    it('should handle cascade deletion workflow', () => {
      // Create course with multiple tasks
      const courseResult = trackerService.createCourse('CS101', 'Computer Science');
      expect(courseResult.success).toBe(true);
      
      if (courseResult.success) {
        const courseId = courseResult.value.id;
        const task1 = trackerService.createTask(courseId, 'Task 1', new Date('2024-12-31'));
        const task2 = trackerService.createTask(courseId, 'Task 2', new Date('2024-12-31'));
        const task3 = trackerService.createTask(courseId, 'Task 3', new Date('2024-12-31'));
        
        expect(task1.success).toBe(true);
        expect(task2.success).toBe(true);
        expect(task3.success).toBe(true);
        
        // Verify tasks exist
        const tasksBefore = trackerService.getTasksByCourse(courseId);
        expect(tasksBefore.length).toBe(3);
        
        // Cascade delete
        const deleteResult = trackerService.deleteCourse(courseId, 'cascade');
        expect(deleteResult.success).toBe(true);
        
        // Verify course is deleted
        const course = trackerService.getCourse(courseId);
        expect(course).toBeNull();
        
        // Verify all tasks are deleted
        if (task1.success) expect(trackerService.getTask(task1.value.id)).toBeNull();
        if (task2.success) expect(trackerService.getTask(task2.value.id)).toBeNull();
        if (task3.success) expect(trackerService.getTask(task3.value.id)).toBeNull();
        
        const allTasks = trackerService.getAllTasks();
        expect(allTasks.length).toBe(0);
      }
    });

    it('should maintain data consistency after multiple operations', () => {
      // Create multiple courses and tasks
      const cs101 = trackerService.createCourse('CS101', 'Computer Science');
      const math201 = trackerService.createCourse('MATH201', 'Mathematics');
      
      expect(cs101.success).toBe(true);
      expect(math201.success).toBe(true);
      
      if (cs101.success && math201.success) {
        // Add tasks
        const task1 = trackerService.createTask(cs101.value.id, 'CS Task 1', new Date('2024-12-31'));
        const task2 = trackerService.createTask(cs101.value.id, 'CS Task 2', new Date('2024-12-31'));
        const task3 = trackerService.createTask(math201.value.id, 'Math Task 1', new Date('2024-12-31'));
        
        // Mark some complete
        if (task1.success) trackerService.markTaskComplete(task1.value.id);
        if (task3.success) trackerService.markTaskComplete(task3.value.id);
        
        // Delete one course with cascade
        trackerService.deleteCourse(cs101.value.id, 'cascade');
        
        // Verify remaining data is consistent
        const courses = trackerService.getAllCourses();
        expect(courses.length).toBe(1);
        expect(courses[0].name).toBe('MATH201');
        
        const tasks = trackerService.getAllTasks();
        expect(tasks.length).toBe(1);
        expect(tasks[0].description).toBe('Math Task 1');
        expect(tasks[0].completed).toBe(true);
        
        // Verify statistics are correct
        const mathProgress = trackerService.getCourseProgress(math201.value.id);
        expect(mathProgress).not.toBeNull();
        if (mathProgress) {
          expect(mathProgress.totalTasks).toBe(1);
          expect(mathProgress.completedTasks).toBe(1);
        }
      }
    });
  });
});
