/**
 * WeeklyView component - displays tasks organized by day and course for a selected week
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { Task, Course } from '../models/types.js';
import { getWeekNumber, getWeekBounds } from '../utils/weekCalculations.js';

export interface WeeklyViewProps {
  tasks: Task[];
  courses: Map<string, Course>;
  weekNumber: number;
  year: number;
  onNavigateWeek: (weekNumber: number, year: number) => void;
  onTaskClick?: (taskId: string) => void;
}

export class WeeklyView {
  private props: WeeklyViewProps;
  private container: HTMLElement | null = null;

  constructor(props: WeeklyViewProps) {
    this.props = props;
  }

  /**
   * Update component props and re-render
   */
  updateProps(props: Partial<WeeklyViewProps>): void {
    this.props = { ...this.props, ...props };
    if (this.container) {
      this.render(this.container);
    }
  }

  /**
   * Render the weekly view to a container element
   */
  render(container: HTMLElement): void {
    this.container = container;
    container.innerHTML = '';
    
    const weekView = this.createWeekView();
    container.appendChild(weekView);
  }

  /**
   * Create the main week view element
   */
  private createWeekView(): HTMLElement {
    const view = document.createElement('div');
    view.className = 'weekly-view';
    
    // Add navigation header
    view.appendChild(this.createNavigationHeader());
    
    // Add week display
    view.appendChild(this.createWeekDisplay());
    
    return view;
  }

  /**
   * Create navigation header with week controls
   */
  private createNavigationHeader(): HTMLElement {
    const header = document.createElement('div');
    header.className = 'weekly-view-header';
    
    const prevButton = document.createElement('button');
    prevButton.textContent = '← Previous Week';
    prevButton.className = 'nav-button';
    prevButton.onclick = () => this.navigateToPreviousWeek();
    
    const weekLabel = document.createElement('h2');
    weekLabel.className = 'week-label';
    const weekBounds = getWeekBounds(this.props.weekNumber, this.props.year);
    weekLabel.textContent = `Week ${this.props.weekNumber}, ${this.props.year} (${this.formatDate(weekBounds.startDate)} - ${this.formatDate(weekBounds.endDate)})`;
    
    const nextButton = document.createElement('button');
    nextButton.textContent = 'Next Week →';
    nextButton.className = 'nav-button';
    nextButton.onclick = () => this.navigateToNextWeek();
    
    header.appendChild(prevButton);
    header.appendChild(weekLabel);
    header.appendChild(nextButton);
    
    return header;
  }

  /**
   * Create the week display with days and tasks
   */
  private createWeekDisplay(): HTMLElement {
    const weekDisplay = document.createElement('div');
    weekDisplay.className = 'week-display';
    
    const weekBounds = getWeekBounds(this.props.weekNumber, this.props.year);
    const days = this.getDaysInWeek(weekBounds.startDate, weekBounds.endDate);
    
    const today = new Date();
    const currentWeek = getWeekNumber(today);
    const isCurrentWeek = currentWeek.weekNumber === this.props.weekNumber && 
                          currentWeek.year === this.props.year;
    
    days.forEach(day => {
      const dayElement = this.createDayElement(day, isCurrentWeek && this.isSameDay(day, today));
      weekDisplay.appendChild(dayElement);
    });
    
    return weekDisplay;
  }

  /**
   * Create a single day element with its tasks
   */
  private createDayElement(date: Date, isToday: boolean): HTMLElement {
    const dayElement = document.createElement('div');
    dayElement.className = `day-element${isToday ? ' today' : ''}`;
    
    const dayHeader = document.createElement('div');
    dayHeader.className = 'day-header';
    dayHeader.textContent = this.formatDayHeader(date);
    dayElement.appendChild(dayHeader);
    
    const tasksForDay = this.getTasksForDay(date);
    const tasksByCourse = this.groupTasksByCourse(tasksForDay);
    
    if (tasksByCourse.size === 0) {
      const noTasks = document.createElement('div');
      noTasks.className = 'no-tasks';
      noTasks.textContent = 'No tasks';
      dayElement.appendChild(noTasks);
    } else {
      tasksByCourse.forEach((tasks, courseId) => {
        const course = this.props.courses.get(courseId);
        if (course) {
          const courseGroup = this.createCourseGroup(course, tasks);
          dayElement.appendChild(courseGroup);
        }
      });
    }
    
    return dayElement;
  }

  /**
   * Create a course group with its tasks
   */
  private createCourseGroup(course: Course, tasks: Task[]): HTMLElement {
    const group = document.createElement('div');
    group.className = 'course-group';
    
    const courseHeader = document.createElement('div');
    courseHeader.className = 'course-header';
    courseHeader.textContent = `${course.name} (${course.department})`;
    group.appendChild(courseHeader);
    
    const taskList = document.createElement('div');
    taskList.className = 'task-list';
    
    tasks.forEach(task => {
      const taskElement = this.createTaskElement(task);
      taskList.appendChild(taskElement);
    });
    
    group.appendChild(taskList);
    
    return group;
  }

  /**
   * Create a task element
   * Requirement 4.4: Show task description, course name, department, and deadline
   */
  private createTaskElement(task: Task): HTMLElement {
    const taskElement = document.createElement('div');
    taskElement.className = `task-element${task.completed ? ' completed' : ''}`;
    
    const description = document.createElement('div');
    description.className = 'task-description';
    description.textContent = task.description;
    
    const deadline = document.createElement('div');
    deadline.className = 'task-deadline';
    deadline.textContent = `Due: ${this.formatDateTime(task.deadline)}`;
    
    taskElement.appendChild(description);
    taskElement.appendChild(deadline);
    
    if (this.props.onTaskClick) {
      taskElement.style.cursor = 'pointer';
      taskElement.onclick = () => this.props.onTaskClick!(task.id);
    }
    
    return taskElement;
  }

  /**
   * Get all days in the week
   */
  private getDaysInWeek(startDate: Date, endDate: Date): Date[] {
    const days: Date[] = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }

  /**
   * Get tasks for a specific day
   */
  private getTasksForDay(date: Date): Task[] {
    return this.props.tasks.filter(task => this.isSameDay(task.deadline, date));
  }

  /**
   * Group tasks by course
   */
  private groupTasksByCourse(tasks: Task[]): Map<string, Task[]> {
    const grouped = new Map<string, Task[]>();
    
    tasks.forEach(task => {
      const courseTasks = grouped.get(task.courseId) || [];
      courseTasks.push(task);
      grouped.set(task.courseId, courseTasks);
    });
    
    return grouped;
  }

  /**
   * Navigate to previous week
   */
  private navigateToPreviousWeek(): void {
    let { weekNumber, year } = this.props;
    weekNumber--;
    
    if (weekNumber < 1) {
      year--;
      weekNumber = this.getWeeksInYear(year);
    }
    
    this.props.onNavigateWeek(weekNumber, year);
  }

  /**
   * Navigate to next week
   */
  private navigateToNextWeek(): void {
    let { weekNumber, year } = this.props;
    weekNumber++;
    
    const weeksInYear = this.getWeeksInYear(year);
    if (weekNumber > weeksInYear) {
      year++;
      weekNumber = 1;
    }
    
    this.props.onNavigateWeek(weekNumber, year);
  }

  /**
   * Get number of weeks in a year (52 or 53)
   */
  private getWeeksInYear(year: number): number {
    const lastDay = new Date(year, 11, 31);
    const weekInfo = getWeekNumber(lastDay);
    return weekInfo.weekNumber === 1 ? 52 : weekInfo.weekNumber;
  }

  /**
   * Check if two dates are the same day
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  /**
   * Format date as MM/DD
   */
  private formatDate(date: Date): string {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }

  /**
   * Format day header as "Day, MM/DD"
   */
  private formatDayHeader(date: Date): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return `${days[date.getDay()]}, ${this.formatDate(date)}`;
  }

  /**
   * Format date and time
   */
  private formatDateTime(date: Date): string {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    
    return `${this.formatDate(date)} ${displayHours}:${displayMinutes} ${ampm}`;
  }
}
