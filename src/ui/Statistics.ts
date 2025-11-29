/**
 * Statistics component - displays weekly statistics and progress tracking
 * Requirements: 6.1, 6.2, 6.3, 6.5
 */

import { WeeklyStatistics, Task } from '../models/types.js';
import { getWeekNumber } from '../utils/weekCalculations.js';

export interface StatisticsProps {
  statistics: WeeklyStatistics;
  overdueTasks: Task[];
  onNavigateWeek: (weekNumber: number, year: number) => void;
  onTaskClick?: (taskId: string) => void;
}

export class Statistics {
  private props: StatisticsProps;
  private container: HTMLElement | null = null;

  constructor(props: StatisticsProps) {
    this.props = props;
  }

  /**
   * Update component props and re-render
   */
  updateProps(props: Partial<StatisticsProps>): void {
    this.props = { ...this.props, ...props };
    if (this.container) {
      this.render(this.container);
    }
  }

  /**
   * Render the statistics view to a container element
   */
  render(container: HTMLElement): void {
    this.container = container;
    container.innerHTML = '';
    
    const view = this.createStatisticsView();
    container.appendChild(view);
  }

  /**
   * Create the main statistics view
   */
  private createStatisticsView(): HTMLElement {
    const view = document.createElement('div');
    view.className = 'statistics-view';
    
    // Add header
    const header = document.createElement('h2');
    header.textContent = 'Weekly Statistics';
    header.className = 'statistics-header';
    view.appendChild(header);
    
    // Add week navigation
    view.appendChild(this.createWeekNavigation());
    
    // Add overall statistics
    view.appendChild(this.createOverallStatistics());
    
    // Add overdue tasks section
    if (this.props.overdueTasks.length > 0) {
      view.appendChild(this.createOverdueSection());
    }
    
    // Add department breakdown
    view.appendChild(this.createDepartmentBreakdown());
    
    // Add course breakdown
    view.appendChild(this.createCourseBreakdown());
    
    return view;
  }

  /**
   * Create week navigation
   */
  private createWeekNavigation(): HTMLElement {
    const nav = document.createElement('div');
    nav.className = 'week-navigation';
    
    const prevButton = document.createElement('button');
    prevButton.textContent = '← Previous Week';
    prevButton.className = 'nav-button';
    prevButton.onclick = () => this.navigateToPreviousWeek();
    
    const weekLabel = document.createElement('span');
    weekLabel.className = 'week-label';
    weekLabel.textContent = `Week ${this.props.statistics.weekNumber}, ${this.props.statistics.year}`;
    
    const nextButton = document.createElement('button');
    nextButton.textContent = 'Next Week →';
    nextButton.className = 'nav-button';
    nextButton.onclick = () => this.navigateToNextWeek();
    
    const currentButton = document.createElement('button');
    currentButton.textContent = 'Current Week';
    currentButton.className = 'current-week-button';
    currentButton.onclick = () => this.navigateToCurrentWeek();
    
    nav.appendChild(prevButton);
    nav.appendChild(weekLabel);
    nav.appendChild(nextButton);
    nav.appendChild(currentButton);
    
    return nav;
  }

  /**
   * Create overall statistics section
   * Requirement 6.1, 6.2: Display total tasks, completed tasks, and completion percentage
   */
  private createOverallStatistics(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'overall-statistics';
    
    const title = document.createElement('h3');
    title.textContent = 'Overall Progress';
    section.appendChild(title);
    
    const stats = this.props.statistics;
    
    // Create statistics cards
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'stats-cards';
    
    cardsContainer.appendChild(this.createStatCard('Total Tasks', stats.totalTasks.toString(), 'total'));
    cardsContainer.appendChild(this.createStatCard('Completed', stats.completedTasks.toString(), 'completed'));
    cardsContainer.appendChild(this.createStatCard('Active', (stats.totalTasks - stats.completedTasks).toString(), 'active'));
    cardsContainer.appendChild(this.createStatCard('Completion Rate', `${stats.completionPercentage.toFixed(1)}%`, 'percentage'));
    
    section.appendChild(cardsContainer);
    
    // Add progress bar
    section.appendChild(this.createProgressBar(stats.completionPercentage));
    
    return section;
  }

  /**
   * Create a statistics card
   */
  private createStatCard(label: string, value: string, type: string): HTMLElement {
    const card = document.createElement('div');
    card.className = `stat-card stat-card-${type}`;
    
    const valueElement = document.createElement('div');
    valueElement.className = 'stat-value';
    valueElement.textContent = value;
    
    const labelElement = document.createElement('div');
    labelElement.className = 'stat-label';
    labelElement.textContent = label;
    
    card.appendChild(valueElement);
    card.appendChild(labelElement);
    
    return card;
  }

  /**
   * Create progress bar
   */
  private createProgressBar(percentage: number): HTMLElement {
    const container = document.createElement('div');
    container.className = 'progress-bar-container';
    
    const bar = document.createElement('div');
    bar.className = 'progress-bar';
    bar.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
    
    container.appendChild(bar);
    
    return container;
  }

  /**
   * Create overdue tasks section
   * Requirement 6.5: Show overdue task count and highlight overdue tasks
   */
  private createOverdueSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'overdue-section';
    
    const title = document.createElement('h3');
    title.className = 'overdue-title';
    title.textContent = `⚠️ Overdue Tasks (${this.props.overdueTasks.length})`;
    section.appendChild(title);
    
    const taskList = document.createElement('div');
    taskList.className = 'overdue-task-list';
    
    // Sort by how overdue they are (most overdue first)
    const sortedTasks = [...this.props.overdueTasks].sort((a, b) => 
      a.deadline.getTime() - b.deadline.getTime()
    );
    
    sortedTasks.forEach(task => {
      const taskElement = this.createOverdueTaskElement(task);
      taskList.appendChild(taskElement);
    });
    
    section.appendChild(taskList);
    
    return section;
  }

  /**
   * Create an overdue task element
   */
  private createOverdueTaskElement(task: Task): HTMLElement {
    const element = document.createElement('div');
    element.className = 'overdue-task';
    
    const description = document.createElement('div');
    description.className = 'overdue-task-description';
    description.textContent = task.description;
    
    const deadline = document.createElement('div');
    deadline.className = 'overdue-task-deadline';
    const daysOverdue = this.getDaysOverdue(task.deadline);
    deadline.textContent = `Due: ${this.formatDateTime(task.deadline)} (${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue)`;
    
    element.appendChild(description);
    element.appendChild(deadline);
    
    if (this.props.onTaskClick) {
      element.style.cursor = 'pointer';
      element.onclick = () => this.props.onTaskClick!(task.id);
    }
    
    return element;
  }

  /**
   * Create department breakdown section
   * Requirement 6.3: Display breakdowns by department
   */
  private createDepartmentBreakdown(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'department-breakdown';
    
    const title = document.createElement('h3');
    title.textContent = 'Progress by Department';
    section.appendChild(title);
    
    const stats = this.props.statistics;
    
    if (stats.statsByDepartment.size === 0) {
      const noData = document.createElement('div');
      noData.className = 'no-data';
      noData.textContent = 'No tasks for this week';
      section.appendChild(noData);
      return section;
    }
    
    const table = document.createElement('table');
    table.className = 'breakdown-table';
    
    // Create header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['Department', 'Total', 'Completed', 'Completion Rate'].forEach(header => {
      const th = document.createElement('th');
      th.textContent = header;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create body
    const tbody = document.createElement('tbody');
    
    // Sort departments alphabetically
    const sortedDepartments = Array.from(stats.statsByDepartment.entries())
      .sort((a, b) => a[0].localeCompare(b[0]));
    
    sortedDepartments.forEach(([_, deptStats]) => {
      const row = document.createElement('tr');
      
      const deptCell = document.createElement('td');
      deptCell.textContent = deptStats.department;
      row.appendChild(deptCell);
      
      const totalCell = document.createElement('td');
      totalCell.textContent = deptStats.totalTasks.toString();
      row.appendChild(totalCell);
      
      const completedCell = document.createElement('td');
      completedCell.textContent = deptStats.completedTasks.toString();
      row.appendChild(completedCell);
      
      const percentageCell = document.createElement('td');
      const percentage = deptStats.totalTasks > 0 
        ? (deptStats.completedTasks / deptStats.totalTasks * 100).toFixed(1)
        : '0.0';
      percentageCell.textContent = `${percentage}%`;
      row.appendChild(percentageCell);
      
      tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    section.appendChild(table);
    
    return section;
  }

  /**
   * Create course breakdown section
   * Requirement 6.3: Display breakdowns by course
   */
  private createCourseBreakdown(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'course-breakdown';
    
    const title = document.createElement('h3');
    title.textContent = 'Progress by Course';
    section.appendChild(title);
    
    const stats = this.props.statistics;
    
    if (stats.statsByCourse.size === 0) {
      const noData = document.createElement('div');
      noData.className = 'no-data';
      noData.textContent = 'No tasks for this week';
      section.appendChild(noData);
      return section;
    }
    
    const table = document.createElement('table');
    table.className = 'breakdown-table';
    
    // Create header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['Course', 'Total', 'Completed', 'Completion Rate'].forEach(header => {
      const th = document.createElement('th');
      th.textContent = header;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create body
    const tbody = document.createElement('tbody');
    
    // Sort courses alphabetically
    const sortedCourses = Array.from(stats.statsByCourse.entries())
      .sort((a, b) => a[1].courseName.localeCompare(b[1].courseName));
    
    sortedCourses.forEach(([_, courseStats]) => {
      const row = document.createElement('tr');
      
      const courseCell = document.createElement('td');
      courseCell.textContent = courseStats.courseName;
      row.appendChild(courseCell);
      
      const totalCell = document.createElement('td');
      totalCell.textContent = courseStats.totalTasks.toString();
      row.appendChild(totalCell);
      
      const completedCell = document.createElement('td');
      completedCell.textContent = courseStats.completedTasks.toString();
      row.appendChild(completedCell);
      
      const percentageCell = document.createElement('td');
      const percentage = courseStats.totalTasks > 0 
        ? (courseStats.completedTasks / courseStats.totalTasks * 100).toFixed(1)
        : '0.0';
      percentageCell.textContent = `${percentage}%`;
      row.appendChild(percentageCell);
      
      tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    section.appendChild(table);
    
    return section;
  }

  /**
   * Navigate to previous week
   */
  private navigateToPreviousWeek(): void {
    let { weekNumber, year } = this.props.statistics;
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
    let { weekNumber, year } = this.props.statistics;
    weekNumber++;
    
    const weeksInYear = this.getWeeksInYear(year);
    if (weekNumber > weeksInYear) {
      year++;
      weekNumber = 1;
    }
    
    this.props.onNavigateWeek(weekNumber, year);
  }

  /**
   * Navigate to current week
   */
  private navigateToCurrentWeek(): void {
    const today = new Date();
    const currentWeek = getWeekNumber(today);
    this.props.onNavigateWeek(currentWeek.weekNumber, currentWeek.year);
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
   * Get days overdue
   */
  private getDaysOverdue(deadline: Date): number {
    const now = new Date();
    const diffMs = now.getTime() - deadline.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Format date and time
   */
  private formatDateTime(date: Date): string {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    
    return `${month}/${day}/${year} ${displayHours}:${displayMinutes} ${ampm}`;
  }
}
