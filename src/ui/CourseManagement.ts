/**
 * CourseManagement component - manages courses with CRUD operations
 * Requirements: 1.1, 1.2, 1.4, 1.5, 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { Course, Result } from '../models/types.js';
import { ValidationError } from '../models/errors.js';

export interface CourseManagementProps {
  courses: Course[];
  taskCounts: Map<string, number>;
  onCreateCourse: (name: string, department: string) => Promise<Result<Course, ValidationError>>;
  onUpdateCourse: (id: string, name: string, department: string) => Promise<Result<Course, ValidationError>>;
  onDeleteCourse: (id: string, hasTasksStrategy?: 'cascade' | 'cancel') => Promise<Result<void, Error>>;
  onRefresh: () => void;
}

export class CourseManagement {
  private props: CourseManagementProps;
  private container: HTMLElement | null = null;
  private editingCourseId: string | null = null;

  constructor(props: CourseManagementProps) {
    this.props = props;
  }

  /**
   * Update component props and re-render
   */
  updateProps(props: Partial<CourseManagementProps>): void {
    this.props = { ...this.props, ...props };
    if (this.container) {
      this.render(this.container);
    }
  }

  /**
   * Render the course management view to a container element
   */
  render(container: HTMLElement): void {
    this.container = container;
    container.innerHTML = '';
    
    const view = this.createCourseManagementView();
    container.appendChild(view);
  }

  /**
   * Create the main course management view
   */
  private createCourseManagementView(): HTMLElement {
    const view = document.createElement('div');
    view.className = 'course-management';
    
    // Add header
    const header = document.createElement('h2');
    header.textContent = 'Course Management';
    header.className = 'course-management-header';
    view.appendChild(header);
    
    // Add course creation form
    view.appendChild(this.createCourseForm());
    
    // Add courses grouped by department
    view.appendChild(this.createCourseList());
    
    return view;
  }

  /**
   * Create course creation form
   * Requirement 1.1, 1.2: Support adding new courses with validation
   */
  private createCourseForm(): HTMLElement {
    const form = document.createElement('div');
    form.className = 'course-form';
    
    const formTitle = document.createElement('h3');
    formTitle.textContent = 'Add New Course';
    form.appendChild(formTitle);
    
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Course Name';
    nameInput.className = 'course-name-input';
    nameInput.id = 'new-course-name';
    
    const departmentInput = document.createElement('input');
    departmentInput.type = 'text';
    departmentInput.placeholder = 'Department';
    departmentInput.className = 'course-department-input';
    departmentInput.id = 'new-course-department';
    
    const addButton = document.createElement('button');
    addButton.textContent = 'Add Course';
    addButton.className = 'add-course-button';
    addButton.onclick = async () => {
      await this.handleCreateCourse(nameInput.value, departmentInput.value);
      nameInput.value = '';
      departmentInput.value = '';
    };
    
    const errorDisplay = document.createElement('div');
    errorDisplay.className = 'error-message';
    errorDisplay.id = 'course-form-error';
    errorDisplay.style.display = 'none';
    
    form.appendChild(nameInput);
    form.appendChild(departmentInput);
    form.appendChild(addButton);
    form.appendChild(errorDisplay);
    
    return form;
  }

  /**
   * Create course list grouped by department
   * Requirement 1.4: Display all courses grouped by department
   * Requirement 7.4: Show task count for each course
   */
  private createCourseList(): HTMLElement {
    const list = document.createElement('div');
    list.className = 'course-list';
    
    const listTitle = document.createElement('h3');
    listTitle.textContent = 'Courses by Department';
    list.appendChild(listTitle);
    
    const coursesByDepartment = this.groupCoursesByDepartment();
    
    if (coursesByDepartment.size === 0) {
      const noCourses = document.createElement('div');
      noCourses.className = 'no-courses';
      noCourses.textContent = 'No courses yet. Add your first course above!';
      list.appendChild(noCourses);
      return list;
    }
    
    // Sort departments alphabetically
    const sortedDepartments = Array.from(coursesByDepartment.keys()).sort();
    
    sortedDepartments.forEach(department => {
      const courses = coursesByDepartment.get(department)!;
      const departmentSection = this.createDepartmentSection(department, courses);
      list.appendChild(departmentSection);
    });
    
    return list;
  }

  /**
   * Create a department section with its courses
   */
  private createDepartmentSection(department: string, courses: Course[]): HTMLElement {
    const section = document.createElement('div');
    section.className = 'department-section';
    
    const departmentHeader = document.createElement('h4');
    departmentHeader.className = 'department-header';
    departmentHeader.textContent = `${department} (${courses.length} course${courses.length !== 1 ? 's' : ''})`;
    section.appendChild(departmentHeader);
    
    const courseContainer = document.createElement('div');
    courseContainer.className = 'department-courses';
    
    courses.forEach(course => {
      const courseElement = this.createCourseElement(course);
      courseContainer.appendChild(courseElement);
    });
    
    section.appendChild(courseContainer);
    
    return section;
  }

  /**
   * Create a course element with edit and delete controls
   * Requirement 7.1: Support editing course name and department
   * Requirement 7.2: Support deleting courses with confirmation
   */
  private createCourseElement(course: Course): HTMLElement {
    const element = document.createElement('div');
    element.className = 'course-element';
    
    if (this.editingCourseId === course.id) {
      element.appendChild(this.createEditForm(course));
    } else {
      element.appendChild(this.createCourseDisplay(course));
    }
    
    return element;
  }

  /**
   * Create course display (non-editing mode)
   */
  private createCourseDisplay(course: Course): HTMLElement {
    const display = document.createElement('div');
    display.className = 'course-display';
    
    const info = document.createElement('div');
    info.className = 'course-info';
    
    const name = document.createElement('div');
    name.className = 'course-name';
    name.textContent = course.name;
    
    const taskCount = this.props.taskCounts.get(course.id) || 0;
    const count = document.createElement('div');
    count.className = 'task-count';
    count.textContent = `${taskCount} task${taskCount !== 1 ? 's' : ''}`;
    
    info.appendChild(name);
    info.appendChild(count);
    
    const actions = document.createElement('div');
    actions.className = 'course-actions';
    
    const editButton = document.createElement('button');
    editButton.textContent = 'Edit';
    editButton.className = 'edit-button';
    editButton.onclick = () => this.startEditing(course.id);
    
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.className = 'delete-button';
    deleteButton.onclick = () => this.handleDeleteCourse(course.id);
    
    actions.appendChild(editButton);
    actions.appendChild(deleteButton);
    
    display.appendChild(info);
    display.appendChild(actions);
    
    return display;
  }

  /**
   * Create edit form for a course
   */
  private createEditForm(course: Course): HTMLElement {
    const form = document.createElement('div');
    form.className = 'course-edit-form';
    
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = course.name;
    nameInput.className = 'edit-course-name';
    nameInput.id = `edit-name-${course.id}`;
    
    const departmentInput = document.createElement('input');
    departmentInput.type = 'text';
    departmentInput.value = course.department;
    departmentInput.className = 'edit-course-department';
    departmentInput.id = `edit-department-${course.id}`;
    
    const actions = document.createElement('div');
    actions.className = 'edit-actions';
    
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save';
    saveButton.className = 'save-button';
    saveButton.onclick = async () => {
      await this.handleUpdateCourse(course.id, nameInput.value, departmentInput.value);
    };
    
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.className = 'cancel-button';
    cancelButton.onclick = () => this.cancelEditing();
    
    actions.appendChild(saveButton);
    actions.appendChild(cancelButton);
    
    const errorDisplay = document.createElement('div');
    errorDisplay.className = 'error-message';
    errorDisplay.id = `edit-error-${course.id}`;
    errorDisplay.style.display = 'none';
    
    form.appendChild(nameInput);
    form.appendChild(departmentInput);
    form.appendChild(actions);
    form.appendChild(errorDisplay);
    
    return form;
  }

  /**
   * Group courses by department
   */
  private groupCoursesByDepartment(): Map<string, Course[]> {
    const grouped = new Map<string, Course[]>();
    
    this.props.courses.forEach(course => {
      const departmentCourses = grouped.get(course.department) || [];
      departmentCourses.push(course);
      grouped.set(course.department, departmentCourses);
    });
    
    return grouped;
  }

  /**
   * Handle course creation
   */
  private async handleCreateCourse(name: string, department: string): Promise<void> {
    const errorDisplay = document.getElementById('course-form-error');
    
    const result = await this.props.onCreateCourse(name, department);
    
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
   * Handle course update
   */
  private async handleUpdateCourse(id: string, name: string, department: string): Promise<void> {
    const errorDisplay = document.getElementById(`edit-error-${id}`);
    
    const result = await this.props.onUpdateCourse(id, name, department);
    
    if (result.success) {
      if (errorDisplay) {
        errorDisplay.style.display = 'none';
      }
      this.editingCourseId = null;
      this.props.onRefresh();
    } else {
      if (errorDisplay) {
        errorDisplay.textContent = result.error.message;
        errorDisplay.style.display = 'block';
      }
    }
  }

  /**
   * Handle course deletion with confirmation
   * Requirement 7.2, 7.3: Delete with confirmation and handle associated tasks
   */
  private async handleDeleteCourse(id: string): Promise<void> {
    const taskCount = this.props.taskCounts.get(id) || 0;
    
    let confirmMessage = 'Are you sure you want to delete this course?';
    let strategy: 'cascade' | 'cancel' | undefined = undefined;
    
    if (taskCount > 0) {
      confirmMessage = `This course has ${taskCount} task${taskCount !== 1 ? 's' : ''}. Deleting the course will also delete all associated tasks. Are you sure?`;
      strategy = 'cascade';
    }
    
    if (confirm(confirmMessage)) {
      const result = await this.props.onDeleteCourse(id, strategy);
      
      if (result.success) {
        this.props.onRefresh();
      } else {
        alert(`Error deleting course: ${result.error.message}`);
      }
    }
  }

  /**
   * Start editing a course
   */
  private startEditing(courseId: string): void {
    this.editingCourseId = courseId;
    if (this.container) {
      this.render(this.container);
    }
  }

  /**
   * Cancel editing
   */
  private cancelEditing(): void {
    this.editingCourseId = null;
    if (this.container) {
      this.render(this.container);
    }
  }
}
