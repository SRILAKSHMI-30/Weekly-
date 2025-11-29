/**
 * Main application shell - coordinates all UI components and services
 * Requirements: All
 */

import { WeeklyView, WeeklyViewProps } from './WeeklyView.js';
import { CourseManagement, CourseManagementProps } from './CourseManagement.js';
import { TaskManagement, TaskManagementProps } from './TaskManagement.js';
import { Statistics, StatisticsProps } from './Statistics.js';
import { Course, Task, WeeklyStatistics, Result } from '../models/types.js';
import { ValidationError } from '../models/errors.js';
import { getWeekNumber } from '../utils/weekCalculations.js';

/**
 * Service interface that the App expects
 * This will be implemented by TrackerService
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

type ViewType = 'weekly' | 'courses' | 'tasks' | 'statistics';

export interface AppConfig {
  container: HTMLElement;
  service: TrackerServiceInterface;
}

export class App {
  private container: HTMLElement;
  private service: TrackerServiceInterface;
  private currentView: ViewType = 'weekly';
  private currentWeekNumber: number;
  private currentYear: number;
  
  // Component instances
  private weeklyView: WeeklyView | null = null;
  private courseManagement: CourseManagement | null = null;
  private taskManagement: TaskManagement | null = null;
  private statistics: Statistics | null = null;
  
  // Loading state
  private isLoading: boolean = false;
  private loadingError: Error | null = null;

  constructor(config: AppConfig) {
    this.container = config.container;
    this.service = config.service;
    
    // Initialize to current week
    const today = new Date();
    const weekInfo = getWeekNumber(today);
    this.currentWeekNumber = weekInfo.weekNumber;
    this.currentYear = weekInfo.year;
  }

  /**
   * Initialize and start the application
   */
  async start(): Promise<void> {
    this.isLoading = true;
    this.render();
    
    try {
      await this.service.initialize();
      this.isLoading = false;
      this.loadingError = null;
      this.render();
    } catch (error) {
      this.isLoading = false;
      this.loadingError = error as Error;
      this.render();
    }
  }

  /**
   * Render the application
   */
  private render(): void {
    this.container.innerHTML = '';
    
    if (this.isLoading) {
      this.renderLoading();
      return;
    }
    
    if (this.loadingError) {
      this.renderError();
      return;
    }
    
    const app = document.createElement('div');
    app.className = 'app';
    
    // Add navigation
    app.appendChild(this.createNavigation());
    
    // Add main content area
    const content = document.createElement('div');
    content.className = 'app-content';
    content.id = 'app-content';
    
    app.appendChild(content);
    
    this.container.appendChild(app);
    
    // Render current view
    this.renderCurrentView();
  }

  /**
   * Render loading state
   */
  private renderLoading(): void {
    const loading = document.createElement('div');
    loading.className = 'app-loading';
    
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    
    const message = document.createElement('div');
    message.className = 'loading-message';
    message.textContent = 'Loading Weekly Course Tracker...';
    
    loading.appendChild(spinner);
    loading.appendChild(message);
    
    this.container.appendChild(loading);
  }

  /**
   * Render error state
   */
  private renderError(): void {
    const error = document.createElement('div');
    error.className = 'app-error';
    
    const title = document.createElement('h2');
    title.textContent = 'Error Loading Application';
    
    const message = document.createElement('div');
    message.className = 'error-message';
    message.textContent = this.loadingError?.message || 'An unknown error occurred';
    
    const retryButton = document.createElement('button');
    retryButton.textContent = 'Retry';
    retryButton.className = 'retry-button';
    retryButton.onclick = () => this.start();
    
    error.appendChild(title);
    error.appendChild(message);
    error.appendChild(retryButton);
    
    this.container.appendChild(error);
  }

  /**
   * Create navigation bar
   */
  private createNavigation(): HTMLElement {
    const nav = document.createElement('nav');
    nav.className = 'app-navigation';
    
    const title = document.createElement('h1');
    title.className = 'app-title';
    title.textContent = 'Weekly Course Tracker';
    nav.appendChild(title);
    
    const tabs = document.createElement('div');
    tabs.className = 'nav-tabs';
    
    const views: Array<{ type: ViewType, label: string }> = [
      { type: 'weekly', label: 'Weekly View' },
      { type: 'courses', label: 'Courses' },
      { type: 'tasks', label: 'Tasks' },
      { type: 'statistics', label: 'Statistics' }
    ];
    
    views.forEach(view => {
      const tab = document.createElement('button');
      tab.className = `nav-tab${this.currentView === view.type ? ' active' : ''}`;
      tab.textContent = view.label;
      tab.onclick = () => this.switchView(view.type);
      tabs.appendChild(tab);
    });
    
    nav.appendChild(tabs);
    
    return nav;
  }

  /**
   * Switch to a different view
   */
  private switchView(view: ViewType): void {
    this.currentView = view;
    this.render();
  }

  /**
   * Render the current view
   */
  private renderCurrentView(): void {
    const content = document.getElementById('app-content');
    if (!content) return;
    
    switch (this.currentView) {
      case 'weekly':
        this.renderWeeklyView(content);
        break;
      case 'courses':
        this.renderCourseManagement(content);
        break;
      case 'tasks':
        this.renderTaskManagement(content);
        break;
      case 'statistics':
        this.renderStatistics(content);
        break;
    }
  }

  /**
   * Render weekly view
   */
  private renderWeeklyView(container: HTMLElement): void {
    const tasks = this.service.getTasksForWeek(this.currentWeekNumber, this.currentYear);
    const courses = new Map(this.service.getAllCourses().map(c => [c.id, c]));
    
    const props: WeeklyViewProps = {
      tasks,
      courses,
      weekNumber: this.currentWeekNumber,
      year: this.currentYear,
      onNavigateWeek: (weekNumber, year) => {
        this.currentWeekNumber = weekNumber;
        this.currentYear = year;
        this.renderCurrentView();
      },
      onTaskClick: (_taskId) => {
        // Switch to task management view and highlight the task
        this.currentView = 'tasks';
        this.render();
      }
    };
    
    if (!this.weeklyView) {
      this.weeklyView = new WeeklyView(props);
    } else {
      this.weeklyView.updateProps(props);
    }
    
    this.weeklyView.render(container);
  }

  /**
   * Render course management
   */
  private renderCourseManagement(container: HTMLElement): void {
    const courses = this.service.getAllCourses();
    const taskCounts = this.service.getTaskCountByCourse();
    
    const props: CourseManagementProps = {
      courses,
      taskCounts,
      onCreateCourse: async (name, department) => {
        return await this.service.createCourse(name, department);
      },
      onUpdateCourse: async (id, name, department) => {
        return await this.service.updateCourse(id, name, department);
      },
      onDeleteCourse: async (id, strategy) => {
        return await this.service.deleteCourse(id, strategy);
      },
      onRefresh: () => {
        this.renderCurrentView();
      }
    };
    
    if (!this.courseManagement) {
      this.courseManagement = new CourseManagement(props);
    } else {
      this.courseManagement.updateProps(props);
    }
    
    this.courseManagement.render(container);
  }

  /**
   * Render task management
   */
  private renderTaskManagement(container: HTMLElement): void {
    const tasks = this.service.getAllTasks();
    const courses = this.service.getAllCourses();
    
    const props: TaskManagementProps = {
      tasks,
      courses,
      onCreateTask: async (courseId, description, deadline) => {
        return await this.service.createTask(courseId, description, deadline);
      },
      onUpdateTask: async (id, description, deadline) => {
        return await this.service.updateTask(id, description, deadline);
      },
      onDeleteTask: async (id) => {
        return await this.service.deleteTask(id);
      },
      onToggleComplete: async (id, completed) => {
        return await this.service.toggleTaskComplete(id, completed);
      },
      onRefresh: () => {
        this.renderCurrentView();
      }
    };
    
    if (!this.taskManagement) {
      this.taskManagement = new TaskManagement(props);
    } else {
      this.taskManagement.updateProps(props);
    }
    
    this.taskManagement.render(container);
  }

  /**
   * Render statistics
   */
  private renderStatistics(container: HTMLElement): void {
    const statistics = this.service.getWeeklyStatistics(this.currentWeekNumber, this.currentYear);
    const overdueTasks = this.service.getOverdueTasks();
    
    const props: StatisticsProps = {
      statistics,
      overdueTasks,
      onNavigateWeek: (weekNumber, year) => {
        this.currentWeekNumber = weekNumber;
        this.currentYear = year;
        this.renderCurrentView();
      },
      onTaskClick: (_taskId) => {
        // Switch to task management view
        this.currentView = 'tasks';
        this.render();
      }
    };
    
    if (!this.statistics) {
      this.statistics = new Statistics(props);
    } else {
      this.statistics.updateProps(props);
    }
    
    this.statistics.render(container);
  }
}
