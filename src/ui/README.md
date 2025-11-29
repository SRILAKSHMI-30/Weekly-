# UI Components - Weekly Course Tracker

This directory contains all the UI components for the Weekly Course Tracker application.

## Components Implemented

### 1. WeeklyView (`WeeklyView.ts`)
Displays tasks organized by day and course for a selected week.

**Features:**
- Shows tasks grouped by day (Monday-Sunday) and course
- Highlights the current day when viewing the current week
- Displays task description, course name, department, and deadline for each task
- Supports navigation between weeks (previous/next)
- Visually distinguishes completed tasks

**Requirements:** 4.1, 4.2, 4.3, 4.4, 4.5

### 2. CourseManagement (`CourseManagement.ts`)
Manages courses with full CRUD operations.

**Features:**
- Displays all courses grouped by department
- Add new courses with validation
- Edit course name and department
- Delete courses with confirmation
- Shows task count for each course
- Handles cascade deletion when courses have associated tasks

**Requirements:** 1.1, 1.2, 1.4, 1.5, 7.1, 7.2, 7.3, 7.4, 7.5

### 3. TaskManagement (`TaskManagement.ts`)
Manages tasks with full CRUD operations and filtering.

**Features:**
- Add new tasks with course selection and deadline
- Edit task description and deadline
- Delete tasks with confirmation
- Mark tasks as complete/incomplete with checkbox
- Visually distinguish completed tasks (strikethrough, opacity)
- Filter tasks by course and status (all/active/completed)
- Display overdue tasks with warning
- Sort tasks by deadline within each course

**Requirements:** 2.1, 2.2, 3.1, 3.3, 3.4, 5.1, 5.2, 5.3, 5.4

### 4. Statistics (`Statistics.ts`)
Displays comprehensive weekly statistics and progress tracking.

**Features:**
- Display overall statistics (total tasks, completed, active, completion percentage)
- Visual progress bar
- Show overdue tasks with count and details
- Display breakdowns by department and course
- Navigate between weeks
- Quick navigation to current week

**Requirements:** 6.1, 6.2, 6.3, 6.5

### 5. App (`App.ts`)
Main application shell that coordinates all components.

**Features:**
- Tab-based navigation between views (Weekly, Courses, Tasks, Statistics)
- Initialize TrackerService on application start
- Handle loading states with spinner
- Handle error states with retry option
- Coordinate data flow between components and services
- Responsive layout

**Requirements:** All

## Service Interface

The UI components expect a `TrackerServiceInterface` that provides:

```typescript
interface TrackerServiceInterface {
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
```

## Styling

Basic CSS styles are provided in `styles.css` with:
- Responsive grid layouts
- Color-coded statistics cards
- Visual distinction for completed/overdue tasks
- Professional color scheme
- Mobile-responsive design

## Usage

To use the application:

1. Implement the `TrackerService` (tasks 6-10 in the implementation plan)
2. Create an instance of the service
3. Initialize the App with a container element and the service
4. Call `app.start()`

Example:
```typescript
import { App } from './src/ui/App.js';
import { TrackerService } from './src/services/TrackerService.js';

const container = document.getElementById('app-root');
const service = new TrackerService();
const app = new App({ container, service });
app.start();
```

## Testing

Property-based tests are included for:
- **Property 12: Task display completeness** - Verifies that all required task information (description, course name, department, deadline) is displayed in the WeeklyView component

## Next Steps

To complete the application:
1. Implement CourseService (task 6)
2. Implement TaskService (task 7)
3. Implement cascade deletion logic (task 8)
4. Implement StatisticsService (task 9)
5. Implement TrackerService (task 10)
6. Run all tests to ensure everything works together (task 11)
