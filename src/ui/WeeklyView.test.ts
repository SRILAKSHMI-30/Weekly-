/**
 * Property-based tests for WeeklyView component
 * **Feature: weekly-course-tracker, Property 12: Task display completeness**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { WeeklyView } from './WeeklyView.js';
import { Task, Course } from '../models/types.js';
import { arbitraryCourse, arbitraryTask } from '../utils/testGenerators.js';
import { getWeekNumber } from '../utils/weekCalculations.js';

describe('WeeklyView - Property Tests', () => {
  /**
   * **Feature: weekly-course-tracker, Property 12: Task display completeness**
   * **Validates: Requirements 4.4**
   * 
   * For any task, the display representation should include the task description,
   * course name, department, and deadline.
   */
  it('should display all required task information (description, course name, department, deadline)', () => {
    fc.assert(
      fc.property(
        arbitraryCourse(),
        arbitraryTask(),
        (course: Course, task: Task) => {
          // Ensure task belongs to the course
          const taskWithCourse = { ...task, courseId: course.id };
          
          // Create a container element
          const container = document.createElement('div');
          
          // Create courses map
          const courses = new Map<string, Course>();
          courses.set(course.id, course);
          
          // Get week info from task deadline
          const { weekNumber, year } = getWeekNumber(task.deadline);
          
          // Create WeeklyView instance
          const weeklyView = new WeeklyView({
            tasks: [taskWithCourse],
            courses,
            weekNumber,
            year,
            onNavigateWeek: () => {}
          });
          
          // Render the view
          weeklyView.render(container);
          
          // Get the rendered HTML
          const html = container.innerHTML;
          
          // Verify all required information is present in the rendered output
          // Task description should be present (but HTML-escaped since we use textContent)
          const trimmedDescription = taskWithCourse.description.trim();
          if (trimmedDescription.length > 0) {
            // textContent only escapes &, <, and > (not quotes)
            // When innerHTML is read, these become &amp;, &lt;, &gt;
            const escapedDescription = trimmedDescription
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');
            expect(html).toContain(escapedDescription);
          }
          
          // Course name should be present (with HTML escaping)
          const escapedCourseName = course.name
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
          expect(html).toContain(escapedCourseName);
          
          // Department should be present (with HTML escaping)
          const escapedDepartment = course.department
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
          expect(html).toContain(escapedDepartment);
          
          // Deadline should be present (check for month and day at minimum)
          const month = taskWithCourse.deadline.getMonth() + 1;
          const day = taskWithCourse.deadline.getDate();
          const deadlineString = `${month}/${day}`;
          expect(html).toContain(deadlineString);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Verify completed tasks are visually distinguished
   * This supports Requirement 3.3
   */
  it('should visually distinguish completed tasks from incomplete tasks', () => {
    fc.assert(
      fc.property(
        arbitraryCourse(),
        arbitraryTask(),
        fc.boolean(),
        (course: Course, task: Task, completed: boolean) => {
          // Set task completion status
          const taskWithStatus = { ...task, courseId: course.id, completed };
          
          const container = document.createElement('div');
          const courses = new Map<string, Course>();
          courses.set(course.id, course);
          
          const { weekNumber, year } = getWeekNumber(task.deadline);
          
          const weeklyView = new WeeklyView({
            tasks: [taskWithStatus],
            courses,
            weekNumber,
            year,
            onNavigateWeek: () => {}
          });
          
          weeklyView.render(container);
          const html = container.innerHTML;
          
          // Check for completed class when task is completed
          if (completed) {
            expect(html).toContain('completed');
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
