/**
 * StatisticsService provides progress tracking and statistics calculation
 * Handles weekly statistics, course progress, and department progress
 */

import { WeeklyStatistics, DepartmentStats, CourseStats, Task } from '../models/types.js';
import { ITaskService } from './TaskService.js';
import { ICourseService } from './CourseService.js';

/**
 * StatisticsService interface
 */
export interface IStatisticsService {
  getWeeklyStatistics(weekNumber: number, year: number): WeeklyStatistics;
  getCourseProgress(courseId: string): CourseStats | null;
  getDepartmentProgress(department: string): DepartmentStats;
}

/**
 * StatisticsService implementation
 */
export class StatisticsService implements IStatisticsService {
  private taskService: ITaskService;
  private courseService: ICourseService;

  constructor(taskService: ITaskService, courseService: ICourseService) {
    this.taskService = taskService;
    this.courseService = courseService;
  }

  /**
   * Get comprehensive statistics for a specific week
   */
  getWeeklyStatistics(weekNumber: number, year: number): WeeklyStatistics {
    // Get all tasks for the week
    const weekTasks = this.taskService.getTasksForWeek(weekNumber, year);
    
    // Calculate basic statistics
    const totalTasks = weekTasks.length;
    const completedTasks = weekTasks.filter(task => task.completed).length;
    const completionPercentage = totalTasks > 0 
      ? Math.round((completedTasks / totalTasks) * 100) 
      : 0;
    
    // Calculate overdue tasks (incomplete tasks with deadline in the past)
    const now = new Date();
    const overdueTasks = weekTasks.filter(task => 
      !task.completed && task.deadline < now
    ).length;
    
    // Calculate statistics by department
    const statsByDepartment = this.calculateDepartmentStats(weekTasks);
    
    // Calculate statistics by course
    const statsByCourse = this.calculateCourseStats(weekTasks);
    
    return {
      weekNumber,
      year,
      totalTasks,
      completedTasks,
      completionPercentage,
      overdueTasks,
      statsByDepartment,
      statsByCourse
    };
  }

  /**
   * Get progress statistics for a specific course
   */
  getCourseProgress(courseId: string): CourseStats | null {
    // Get the course
    const course = this.courseService.getCourse(courseId);
    if (!course) {
      return null;
    }
    
    // Get all tasks for the course
    const courseTasks = this.taskService.getTasksByCourse(courseId);
    
    // Calculate statistics
    const totalTasks = courseTasks.length;
    const completedTasks = courseTasks.filter(task => task.completed).length;
    
    return {
      courseId: course.id,
      courseName: course.name,
      totalTasks,
      completedTasks
    };
  }

  /**
   * Get progress statistics for a specific department
   */
  getDepartmentProgress(department: string): DepartmentStats {
    // Get all courses in the department
    const allCourses = this.courseService.getAllCourses();
    const departmentCourses = allCourses.filter(course => 
      course.department === department
    );
    
    // Get all tasks for courses in this department
    let totalTasks = 0;
    let completedTasks = 0;
    
    for (const course of departmentCourses) {
      const courseTasks = this.taskService.getTasksByCourse(course.id);
      totalTasks += courseTasks.length;
      completedTasks += courseTasks.filter(task => task.completed).length;
    }
    
    return {
      department,
      totalTasks,
      completedTasks
    };
  }

  /**
   * Calculate statistics grouped by department for a set of tasks
   */
  private calculateDepartmentStats(tasks: Task[]): Map<string, DepartmentStats> {
    const departmentMap = new Map<string, DepartmentStats>();
    
    // Group tasks by department
    for (const task of tasks) {
      const course = this.courseService.getCourse(task.courseId);
      if (!course) {
        continue; // Skip tasks with invalid course references
      }
      
      const department = course.department;
      
      // Get or create department stats
      let stats = departmentMap.get(department);
      if (!stats) {
        stats = {
          department,
          totalTasks: 0,
          completedTasks: 0
        };
        departmentMap.set(department, stats);
      }
      
      // Update statistics
      stats.totalTasks++;
      if (task.completed) {
        stats.completedTasks++;
      }
    }
    
    return departmentMap;
  }

  /**
   * Calculate statistics grouped by course for a set of tasks
   */
  private calculateCourseStats(tasks: Task[]): Map<string, CourseStats> {
    const courseMap = new Map<string, CourseStats>();
    
    // Group tasks by course
    for (const task of tasks) {
      const course = this.courseService.getCourse(task.courseId);
      if (!course) {
        continue; // Skip tasks with invalid course references
      }
      
      // Get or create course stats
      let stats = courseMap.get(task.courseId);
      if (!stats) {
        stats = {
          courseId: course.id,
          courseName: course.name,
          totalTasks: 0,
          completedTasks: 0
        };
        courseMap.set(task.courseId, stats);
      }
      
      // Update statistics
      stats.totalTasks++;
      if (task.completed) {
        stats.completedTasks++;
      }
    }
    
    return courseMap;
  }
}
