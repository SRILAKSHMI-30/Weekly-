/**
 * TaskManagement component - manages tasks with CRUD operations
 * Requirements: 2.1, 2.2, 3.1, 3.3, 3.4, 5.1, 5.2, 5.3, 5.4
 */

import { Task, Course, Result } from '../models/types.js';
import { ValidationError } from '../models/errors.js';

export interface TaskManagementProps {
  tasks: Task[];
  courses: Course[];
  onCreateTask: (courseId: string, description: string, deadline: Date) => Promise<Result<Task, ValidationError>>;
  onUpdateTask: (id: string, description: string, deadline: Date) => Promise<Result<Task, ValidationError>>;
  onDeleteTask: (id: string) => Promise<Result<void, Error>>;
  onToggleComplete: (id: string, completed: boolean) => Promise<Result<Task, Error>>;
  onRefresh: () => void;
}

export class TaskManagement {
  private props: TaskManagementProps;
  private container: HTMLElement | null = null;
  private editingTaskId: string | null = null;
  private filterCourseId: string | null = null;
  private filterStatus: 'all' | 'active' | 'completed' = 'all';

  constructor(props: TaskManagementProps) {
    this.props = props;
  }

  /**
   * Update component props and re-render
   */
  updateProps(props: Partial<TaskManagementProps>): void {
    this.props = { ...this.props, ...props };
    if (this.container) {
      this.render(this.container);
    }
  }

  /**
   * Render the task management view to a container element
   */
  render(container: HTMLElement): void {
    this.container = container;
    container.innerHTML = '';
    
    const view = this.createTaskManagementView();
    container.appendChild(view);
  }

  /**
   * Create the main task management view
   */
  private createTaskManagementView(): HTMLElement {
    const view = document.createElement('div');
    view.className = 'task-management';
    
    // Add header
    const header = document.createElement('h2');
    header.textContent = 'Task Management';
    header.className = 'task-management-header';
    view.appendChild(header);
    
    // Add task creation form
    view.appendChild(this.createTaskForm());
    
    // Add filters
    view.appendChild(this.createFilters());
    
    // Add task list
    view.appendChild(this.createTaskList());
    
    return view;
  }

  /**
   * Create task creation form
   * Requirement 2.1, 2.2: Support adding new tasks with validation
   */
  private createTaskForm(): HTMLElement {
    const form = document.createElement('div');
    form.className = 'task-form';
    
    const formTitle = document.createElement('h3');
    formTitle.textContent = 'Add New Task';
    form.appendChild(formTitle);
    
    const descriptionInput = document.createElement('input');
    descriptionInput.type = 'text';
    descriptionInput.placeholder = 'Task Description';
    descriptionInput.className = 'task-description-input';
    descriptionInput.id = 'new-task-description';
    
    const courseSelect = document.createElement('select');
    courseSelect.className = 'task-course-select';
    courseSelect.id = 'new-task-course';
    
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select Course';
    courseSelect.appendChild(defaultOption);
    
    this.props.courses.forEach(course => {
      const option = document.createElement('option');
      option.value = course.id;
      option.textContent = `${course.name} (${course.department})`;
      courseSelect.appendChild(option);
    });
    
    const deadlineInput = document.createElement('input');
    deadlineInput.type = 'datetime-local';
    deadlineInput.className = 'task-deadline-input';
    deadlineInput.id = 'new-task-deadline';
    
    const addButton = document.createElement('button');
    addButton.textContent = 'Add Task';
    addButton.className = 'add-task-button';
    addButton.onclick = async () => {
      const deadline = deadlineInput.value ? new Date(deadlineInput.value) : new Date();
      await this.handleCreateTask(courseSelect.value, descriptionInput.value, deadline);
      descriptionInput.value = '';
      courseSelect.value = '';
      deadlineInput.value = '';
    };
    
    const errorDisplay = document.createElement('div');
    errorDisplay.className = 'error-message';
    errorDisplay.id = 'task-form-error';
    errorDisplay.style.display = 'none';
    
    form.appendChild(descriptionInput);
    form.appendChild(courseSelect);
    form.appendChild(deadlineInput);
    form.appendChild(addButton);
    form.appendChild(errorDisplay);
    
    return form;
  }

  /**
   * Create filter controls
   */
  private createFilters(): HTMLElement {
    const filters = document.createElement('div');
    filters.className = 'task-filters';
    
    const filterTitle = document.createElement('h3');
    filterTitle.textContent = 'Filters';
    filters.appendChild(filterTitle);
    
    // Course filter
    const courseFilterLabel = document.createElement('label');
    courseFilterLabel.textContent = 'Course: ';
    
    const courseFilter = document.createElement('select');
    courseFilter.className = 'course-filter';
    
    const allCoursesOption = document.createElement('option');
    allCoursesOption.value = '';
    allCoursesOption.textContent = 'All Courses';
    courseFilter.appendChild(allCoursesOption);
    
    this.props.courses.forEach(course => {
      const option = document.createElement('option');
      option.value = course.id;
      option.textContent = `${course.name} (${course.department})`;
      if (this.filterCourseId === course.id) {
        option.selected = true;
      }
      courseFilter.appendChild(option);
    });
    
    courseFilter.onchange = () => {
      this.filterCourseId = courseFilter.value || null;
      if (this.container) {
        this.render(this.container);
      }
    };
    
    courseFilterLabel.appendChild(courseFilter);
    filters.appendChild(courseFilterLabel);
    
    // Status filter
    const statusFilterLabel = document.createElement('label');
    statusFilterLabel.textContent = ' Status: ';
    
    const statusFilter = document.createElement('select');
    statusFilter.className = 'status-filter';
    
    const statuses: Array<{ value: 'all' | 'active' | 'completed', label: string }> = [
      { value: 'all', label: 'All Tasks' },
      { value: 'active', label: 'Active' },
      { value: 'completed', label: 'Completed' }
    ];
    
    statuses.forEach(status => {
      const option = document.createElement('option');
      option.value = status.value;
      option.textContent = status.label;
      if (this.filterStatus === status.value) {
        option.selected = true;
      }
      statusFilter.appendChild(option);
    });
    
    statusFilter.onchange = () => {
      this.filterStatus = statusFilter.value as 'all' | 'active' | 'completed';
      if (this.container) {
        this.render(this.container);
      }
    };
    
    statusFilterLabel.appendChild(statusFilter);
    filters.appendChild(statusFilterLabel);
    
    return filters;
  }

  /**
   * Create task list
   */
  private createTaskList(): HTMLElement {
    const list = document.createElement('div');
    list.className = 'task-list';
    
    const listTitle = document.createElement('h3');
    listTitle.textContent = 'Tasks';
    list.appendChild(listTitle);
    
    const filteredTasks = this.getFilteredTasks();
    
    if (filteredTasks.length === 0) {
      const noTasks = document.createElement('div');
      noTasks.className = 'no-tasks';
      noTasks.textContent = 'No tasks match the current filters.';
      list.appendChild(noTasks);
      return list;
    }
    
    // Group tasks by course
    const tasksByCourse = this.groupTasksByCourse(filteredTasks);
    
    tasksByCourse.forEach((tasks, courseId) => {
      const course = this.props.courses.find(c => c.id === courseId);
      if (course) {
        const courseSection = this.createCourseSection(course, tasks);
        list.appendChild(courseSection);
      }
    });
    
    return list;
  }

  /**
   * Create a course section with its tasks
   */
  private createCourseSection(course: Course, tasks: Task[]): HTMLElement {
    const section = document.createElement('div');
    section.className = 'course-section';
    
    const courseHeader = document.createElement('h4');
    courseHeader.className = 'course-header';
    courseHeader.textContent = `${course.name} (${course.department}) - ${tasks.length} task${tasks.length !== 1 ? 's' : ''}`;
    section.appendChild(courseHeader);
    
    const taskContainer = document.createElement('div');
    taskContainer.className = 'course-tasks';
    
    // Sort tasks by deadline
    const sortedTasks = [...tasks].sort((a, b) => a.deadline.getTime() - b.deadline.getTime());
    
    sortedTasks.forEach(task => {
      const taskElement = this.createTaskElement(task);
      taskContainer.appendChild(taskElement);
    });
    
    section.appendChild(taskContainer);
    
    return section;
  }

  /**
   * Create a task element
   * Requirement 3.3: Visually distinguish completed tasks from incomplete tasks
   */
  private createTaskElement(task: Task): HTMLElement {
    const element = document.createElement('div');
    element.className = `task-element${task.completed ? ' completed' : ''}`;
    
    if (this.editingTaskId === task.id) {
      element.appendChild(this.createEditForm(task));
    } else {
      element.appendChild(this.createTaskDisplay(task));
    }
    
    return element;
  }

  /**
   * Create task display (non-editing mode)
   */
  private createTaskDisplay(task: Task): HTMLElement {
    const display = document.createElement('div');
    display.className = 'task-display';
    
    // Checkbox for completion
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.completed;
    checkbox.className = 'task-checkbox';
    checkbox.onchange = async () => {
      await this.handleToggleComplete(task.id, checkbox.checked);
    };
    
    const info = document.createElement('div');
    info.className = 'task-info';
    
    const description = document.createElement('div');
    description.className = 'task-description';
    description.textContent = task.description;
    if (task.completed) {
      description.style.textDecoration = 'line-through';
    }
    
    const deadline = document.createElement('div');
    deadline.className = 'task-deadline';
    deadline.textContent = `Due: ${this.formatDateTime(task.deadline)}`;
    
    // Check if overdue
    if (!task.completed && task.deadline < new Date()) {
      deadline.classList.add('overdue');
      deadline.textContent += ' (OVERDUE)';
    }
    
    info.appendChild(description);
    info.appendChild(deadline);
    
    const actions = document.createElement('div');
    actions.className = 'task-actions';
    
    const editButton = document.createElement('button');
    editButton.textContent = 'Edit';
    editButton.className = 'edit-button';
    editButton.onclick = () => this.startEditing(task.id);
    
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.className = 'delete-button';
    deleteButton.onclick = () => this.handleDeleteTask(task.id);
    
    actions.appendChild(editButton);
    actions.appendChild(deleteButton);
    
    display.appendChild(checkbox);
    display.appendChild(info);
    display.appendChild(actions);
    
    return display;
  }

  /**
   * Create edit form for a task
   * Requirement 5.1: Support editing task description and deadline
   */
  private createEditForm(task: Task): HTMLElement {
    const form = document.createElement('div');
    form.className = 'task-edit-form';
    
    const descriptionInput = document.createElement('input');
    descriptionInput.type = 'text';
    descriptionInput.value = task.description;
    descriptionInput.className = 'edit-task-description';
    descriptionInput.id = `edit-description-${task.id}`;
    
    const deadlineInput = document.createElement('input');
    deadlineInput.type = 'datetime-local';
    deadlineInput.value = this.formatDateTimeForInput(task.deadline);
    deadlineInput.className = 'edit-task-deadline';
    deadlineInput.id = `edit-deadline-${task.id}`;
    
    const actions = document.createElement('div');
    actions.className = 'edit-actions';
    
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save';
    saveButton.className = 'save-button';
    saveButton.onclick = async () => {
      const newDeadline = new Date(deadlineInput.value);
      await this.handleUpdateTask(task.id, descriptionInput.value, newDeadline);
    };
    
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.className = 'cancel-button';
    cancelButton.onclick = () => this.cancelEditing();
    
    actions.appendChild(saveButton);
    actions.appendChild(cancelButton);
    
    const errorDisplay = document.createElement('div');
    errorDisplay.className = 'error-message';
    errorDisplay.id = `edit-error-${task.id}`;
    errorDisplay.style.display = 'none';
    
    form.appendChild(descriptionInput);
    form.appendChild(deadlineInput);
    form.appendChild(actions);
    form.appendChild(errorDisplay);
    
    return form;
  }

  /**
   * Get filtered tasks based on current filters
   */
  private getFilteredTasks(): Task[] {
    return this.props.tasks.filter(task => {
      // Filter by course
      if (this.filterCourseId && task.courseId !== this.filterCourseId) {
        return false;
      }
      
      // Filter by status
      if (this.filterStatus === 'active' && task.completed) {
        return false;
      }
      if (this.filterStatus === 'completed' && !task.completed) {
        return false;
      }
      
      return true;
    });
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
   * Handle task creation
   */
  private async handleCreateTask(courseId: string, description: string, deadline: Date): Promise<void> {
    const errorDisplay = document.getElementById('task-form-error');
    
    if (!courseId) {
      if (errorDisplay) {
        errorDisplay.textContent = 'Please select a course';
        errorDisplay.style.display = 'block';
      }
      return;
    }
    
    const result = await this.props.onCreateTask(courseId, description, deadline);
    
    if (result.success) {
      if (errorDisplay) {
        errorDisplay.style.display = 'none';
      }
      this.props.onRefresh();
    } else {
      if (errorDisplay) {
        errorDisplay.textContent = result.error.message;
        errorDisplay.style.display = 'block';
      }
    }
  }

  /**
   * Handle task update
   */
  private async handleUpdateTask(id: string, description: string, deadline: Date): Promise<void> {
    const errorDisplay = document.getElementById(`edit-error-${id}`);
    
    const result = await this.props.onUpdateTask(id, description, deadline);
    
    if (result.success) {
      if (errorDisplay) {
        errorDisplay.style.display = 'none';
      }
      this.editingTaskId = null;
      this.props.onRefresh();
    } else {
      if (errorDisplay) {
        errorDisplay.textContent = result.error.message;
        errorDisplay.style.display = 'block';
      }
    }
  }

  /**
   * Handle task deletion
   * Requirement 5.2: Support deleting tasks
   */
  private async handleDeleteTask(id: string): Promise<void> {
    if (confirm('Are you sure you want to delete this task?')) {
      const result = await this.props.onDeleteTask(id);
      
      if (result.success) {
        this.props.onRefresh();
      } else {
        alert(`Error deleting task: ${result.error.message}`);
      }
    }
  }

  /**
   * Handle toggle complete
   * Requirement 3.1, 3.4: Support marking tasks as complete/incomplete
   */
  private async handleToggleComplete(id: string, completed: boolean): Promise<void> {
    const result = await this.props.onToggleComplete(id, completed);
    
    if (result.success) {
      this.props.onRefresh();
    } else {
      alert(`Error updating task: ${result.error.message}`);
    }
  }

  /**
   * Start editing a task
   */
  private startEditing(taskId: string): void {
    this.editingTaskId = taskId;
    if (this.container) {
      this.render(this.container);
    }
  }

  /**
   * Cancel editing
   */
  private cancelEditing(): void {
    this.editingTaskId = null;
    if (this.container) {
      this.render(this.container);
    }
  }

  /**
   * Format date and time for display
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

  /**
   * Format date and time for input field
   */
  private formatDateTimeForInput(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }
}
