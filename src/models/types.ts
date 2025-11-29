/**
 * Core type definitions for the Weekly Course Tracker
 */

/**
 * Result type for operations that can fail
 */
export type Result<T, E> = 
  | { success: true; value: T }
  | { success: false; error: E };

/**
 * Course represents an academic class or subject
 */
export interface Course {
  id: string;              // Unique identifier (UUID)
  name: string;            // Course name (non-empty)
  department: string;      // Department name (non-empty)
  createdAt: Date;         // Creation timestamp
}

/**
 * Task represents an academic activity with a deadline
 */
export interface Task {
  id: string;              // Unique identifier (UUID)
  courseId: string;        // Reference to Course
  description: string;     // Task description (non-empty)
  deadline: Date;          // Due date and time
  completed: boolean;      // Completion status
  completedAt?: Date;      // Completion timestamp (optional)
  createdAt: Date;         // Creation timestamp
}

/**
 * WeekView represents all tasks for a specific week
 */
export interface WeekView {
  weekNumber: number;      // ISO week number
  year: number;            // Year
  startDate: Date;         // Week start (Monday)
  endDate: Date;           // Week end (Sunday)
  tasks: Task[];           // Tasks for this week
}

/**
 * DepartmentStats represents statistics for a department
 */
export interface DepartmentStats {
  department: string;
  totalTasks: number;
  completedTasks: number;
}

/**
 * CourseStats represents statistics for a course
 */
export interface CourseStats {
  courseId: string;
  courseName: string;
  totalTasks: number;
  completedTasks: number;
}

/**
 * WeeklyStatistics represents comprehensive statistics for a week
 */
export interface WeeklyStatistics {
  weekNumber: number;
  year: number;
  totalTasks: number;
  completedTasks: number;
  completionPercentage: number;
  overdueTasks: number;
  statsByDepartment: Map<string, DepartmentStats>;
  statsByCourse: Map<string, CourseStats>;
}
