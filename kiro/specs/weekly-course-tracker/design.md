# Design Document: Weekly Course Tracker

## Overview

The Weekly Course Tracker is a client-side application that helps college students manage their academic workload through a weekly-organized interface. The system provides CRUD operations for courses and tasks, automatic deadline tracking, progress statistics, and persistent local storage. The architecture follows a layered approach with clear separation between data models, business logic, storage, and presentation layers.

The application will be built as a web-based interface using TypeScript for type safety and maintainability. The design emphasizes simplicity, data integrity, and a responsive user experience.

## Architecture

The system follows a layered architecture pattern:

```
┌─────────────────────────────────────┐
│      Presentation Layer (UI)        │
│   - Weekly View Component           │
│   - Course Management Component     │
│   - Task Management Component       │
│   - Statistics Component            │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│       Application Layer              │
│   - TrackerService                   │
│   - CourseService                    │
│   - TaskService                      │
│   - StatisticsService                │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│         Domain Layer                 │
│   - Course Model                     │
│   - Task Model                       │
│   - Week Model                       │
│   - Validation Logic                 │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│       Storage Layer                  │
│   - StorageService                   │
│   - LocalStorage Adapter             │
└─────────────────────────────────────┘
```

### Key Design Decisions

1. **Client-side architecture**: All data processing and storage happens in the browser using localStorage, eliminating the need for a backend server
2. **TypeScript**: Provides type safety and better developer experience
3. **Immutable data updates**: State changes create new objects rather than mutating existing ones
4. **Service-based architecture**: Business logic is encapsulated in service classes for testability and reusability
5. **Week-based organization**: Tasks are organized by ISO week numbers for consistent weekly views

## Components and Interfaces

### Domain Models

#### Course
```typescript
interface Course {
  id: string;              // Unique identifier (UUID)
  name: string;            // Course name (non-empty)
  department: string;      // Department name (non-empty)
  createdAt: Date;         // Creation timestamp
}
```

#### Task
```typescript
interface Task {
  id: string;              // Unique identifier (UUID)
  courseId: string;        // Reference to Course
  description: string;     // Task description (non-empty)
  deadline: Date;          // Due date and time
  completed: boolean;      // Completion status
  completedAt?: Date;      // Completion timestamp (optional)
  createdAt: Date;         // Creation timestamp
}
```

#### WeekView
```typescript
interface WeekView {
  weekNumber: number;      // ISO week number
  year: number;            // Year
  startDate: Date;         // Week start (Monday)
  endDate: Date;           // Week end (Sunday)
  tasks: Task[];           // Tasks for this week
}
```

#### WeeklyStatistics
```typescript
interface WeeklyStatistics {
  weekNumber: number;
  year: number;
  totalTasks: number;
  completedTasks: number;
  completionPercentage: number;
  overdueTasks: number;
  statsByDepartment: Map<string, DepartmentStats>;
  statsByCourse: Map<string, CourseStats>;
}

interface DepartmentStats {
  department: string;
  totalTasks: number;
  completedTasks: number;
}

interface CourseStats {
  courseId: string;
  courseName: string;
  totalTasks: number;
  completedTasks: number;
}
```

### Service Interfaces

#### CourseService
```typescript
interface CourseService {
  createCourse(name: string, department: string): Result<Course, ValidationError>;
  getCourse(id: string): Course | null;
  getAllCourses(): Course[];
  getCoursesByDepartment(): Map<string, Course[]>;
  updateCourse(id: string, updates: Partial<Course>): Result<Course, ValidationError>;
  deleteCourse(id: string): Result<void, Error>;
  courseExists(name: string, department: string): boolean;
}
```

#### TaskService
```typescript
interface TaskService {
  createTask(courseId: string, description: string, deadline: Date): Result<Task, ValidationError>;
  getTask(id: string): Task | null;
  getAllTasks(): Task[];
  getTasksByCourse(courseId: string): Task[];
  getTasksForWeek(weekNumber: number, year: number): Task[];
  updateTask(id: string, updates: Partial<Task>): Result<Task, ValidationError>;
  deleteTask(id: string): Result<void, Error>;
  markComplete(id: string): Result<Task, Error>;
  markIncomplete(id: string): Result<Task, Error>;
  getOverdueTasks(): Task[];
}
```

#### StatisticsService
```typescript
interface StatisticsService {
  getWeeklyStatistics(weekNumber: number, year: number): WeeklyStatistics;
  getCourseProgress(courseId: string): CourseStats;
  getDepartmentProgress(department: string): DepartmentStats;
}
```

#### StorageService
```typescript
interface StorageService {
  save<T>(key: string, data: T): Result<void, StorageError>;
  load<T>(key: string): Result<T, StorageError>;
  delete(key: string): Result<void, StorageError>;
  clear(): Result<void, StorageError>;
}
```

## Data Models

### Validation Rules

**Course Validation:**
- `name`: Must be non-empty string, trimmed of whitespace
- `department`: Must be non-empty string, trimmed of whitespace
- Uniqueness: No duplicate (name, department) pairs allowed

**Task Validation:**
- `description`: Must be non-empty string, trimmed of whitespace
- `deadline`: Must be a valid Date object
- `courseId`: Must reference an existing course

### Data Relationships

- Each Task belongs to exactly one Course (many-to-one)
- Courses can have zero or many Tasks (one-to-many)
- Deleting a Course requires handling associated Tasks (cascade delete or reassignment)

### Storage Schema

Data is stored in localStorage with the following keys:
- `tracker:courses`: Array of Course objects
- `tracker:tasks`: Array of Task objects
- `tracker:version`: Schema version for migration support

All dates are serialized as ISO 8601 strings and deserialized back to Date objects.


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Course creation with valid data
*For any* non-empty course name and department, creating a course should result in a course object with a unique ID, the specified name and department, and a creation timestamp.
**Validates: Requirements 1.1, 1.3**

### Property 2: Empty course name rejection
*For any* string composed entirely of whitespace, attempting to create a course with that name should be rejected with a validation error.
**Validates: Requirements 1.2**

### Property 3: Course grouping by department
*For any* collection of courses, grouping them by department should return a map where each department contains only courses belonging to that department, and all courses appear exactly once.
**Validates: Requirements 1.4**

### Property 4: Duplicate course prevention
*For any* existing course, attempting to create another course with the same name and department should be rejected.
**Validates: Requirements 1.5**

### Property 5: Task creation and week association
*For any* valid task description, existing course ID, and deadline, creating a task should result in a task object associated with the correct course and appearing in the week view corresponding to the deadline's week.
**Validates: Requirements 2.1, 2.3**

### Property 6: Task validation
*For any* string composed entirely of whitespace or invalid date, attempting to create a task with that description or deadline should be rejected with a validation error.
**Validates: Requirements 2.2**

### Property 7: Week view filtering
*For any* week number and year, retrieving tasks for that week should return only tasks whose deadlines fall within that week, organized by course.
**Validates: Requirements 2.4, 4.1**

### Property 8: Overdue task detection
*For any* incomplete task with a deadline in the past, the system should identify it as overdue.
**Validates: Requirements 2.5**

### Property 9: Task completion state change
*For any* task, marking it as complete should update its status to completed and record a completion timestamp.
**Validates: Requirements 3.1, 3.2**

### Property 10: Completion round-trip
*For any* task, marking it complete then marking it incomplete should restore it to an active state with completed status false.
**Validates: Requirements 3.4**

### Property 11: Weekly progress calculation
*For any* collection of tasks for a course in a week, the completion percentage should equal (completed tasks / total tasks) × 100.
**Validates: Requirements 3.5, 6.2**

### Property 12: Task display completeness
*For any* task, the display representation should include the task description, course name, department, and deadline.
**Validates: Requirements 4.4**

### Property 13: Task update persistence
*For any* existing task and valid updates, modifying the task should result in the task having the new values while maintaining its ID.
**Validates: Requirements 5.1**

### Property 14: Task deletion
*For any* existing task, deleting it should result in the task no longer being retrievable from the system.
**Validates: Requirements 5.2**

### Property 15: Deadline change triggers week reassignment
*For any* task, changing its deadline to a date in a different week should result in the task appearing in the new week's view and not in the old week's view.
**Validates: Requirements 5.4**

### Property 16: Non-existent task error handling
*For any* non-existent task ID, attempting to update or delete that task should return an error rather than succeeding or crashing.
**Validates: Requirements 5.5**

### Property 17: Weekly statistics accuracy
*For any* week, the weekly statistics should accurately count total tasks, completed tasks, and overdue tasks, with breakdowns by course and department matching the actual task data.
**Validates: Requirements 6.1, 6.3, 6.5**

### Property 18: Course update persistence
*For any* existing course and valid updates, modifying the course should result in the course having the new values and all associated tasks reflecting the updated course information.
**Validates: Requirements 7.1, 7.5**

### Property 19: Course deletion
*For any* existing course, deleting it should result in the course no longer being retrievable from the system.
**Validates: Requirements 7.2**

### Property 20: Cascade deletion or reassignment
*For any* course with associated tasks, deleting the course should either delete all associated tasks (cascade) or handle them according to the specified strategy, with no orphaned tasks remaining.
**Validates: Requirements 7.3**

### Property 21: Course list with task counts
*For any* collection of courses, the course list display should show each course with an accurate count of its associated tasks.
**Validates: Requirements 7.4**

### Property 22: Storage round-trip
*For any* valid application state (courses and tasks), saving the state to storage and then loading it should produce an equivalent state with all courses and tasks preserved.
**Validates: Requirements 8.1, 8.2**

### Property 23: Storage validation
*For any* invalid data, attempting to save it to storage should be rejected with a validation error before writing.
**Validates: Requirements 8.3**

### Property 24: Corrupted data handling
*For any* corrupted or invalid data in storage, loading the application should handle the error gracefully without crashing, either by recovering partial data or initializing with empty state.
**Validates: Requirements 8.5**

## Error Handling

The system uses a Result type pattern for operations that can fail:

```typescript
type Result<T, E> = 
  | { success: true; value: T }
  | { success: false; error: E };
```

### Error Types

**ValidationError**: Input validation failures
- Empty or whitespace-only strings
- Invalid dates
- Duplicate course names within a department
- References to non-existent entities

**StorageError**: Persistence failures
- localStorage quota exceeded
- Corrupted data
- Serialization/deserialization errors
- Browser storage disabled

**NotFoundError**: Entity lookup failures
- Course or task ID not found
- Attempting operations on deleted entities

### Error Handling Strategy

1. **Validation errors**: Return immediately with descriptive error messages, no state changes
2. **Storage errors**: Attempt recovery, notify user, maintain in-memory state
3. **Not found errors**: Return error result, allow caller to decide handling
4. **Corrupted data**: Log error, attempt partial recovery, initialize with empty state if necessary

## Testing Strategy

The Weekly Course Tracker will employ a comprehensive testing approach combining unit tests and property-based tests to ensure correctness and reliability.

### Property-Based Testing

Property-based testing will be implemented using **fast-check** (for TypeScript/JavaScript), which will automatically generate hundreds of test cases to verify that our correctness properties hold across a wide range of inputs.

**Configuration:**
- Each property-based test will run a minimum of 100 iterations
- Each test will be tagged with a comment referencing the specific correctness property from this design document
- Tag format: `**Feature: weekly-course-tracker, Property {number}: {property_text}**`

**Property Test Coverage:**
- All 24 correctness properties listed above will be implemented as property-based tests
- Tests will use custom generators for domain objects (courses, tasks, dates, etc.)
- Generators will produce both valid and edge-case inputs (empty strings, boundary dates, etc.)

**Example Property Test Structure:**
```typescript
// **Feature: weekly-course-tracker, Property 1: Course creation with valid data**
it('should create courses with unique IDs for any valid name and department', () => {
  fc.assert(
    fc.property(
      fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
      fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
      (name, department) => {
        const course = courseService.createCourse(name, department);
        expect(course.success).toBe(true);
        if (course.success) {
          expect(course.value.id).toBeDefined();
          expect(course.value.name).toBe(name.trim());
          expect(course.value.department).toBe(department.trim());
        }
      }
    ),
    { numRuns: 100 }
  );
});
```

### Unit Testing

Unit tests will complement property-based tests by verifying specific examples, edge cases, and integration points:

**Unit Test Coverage:**
- Specific examples demonstrating correct behavior (e.g., creating a course named "CS101" in "Computer Science")
- Edge cases (e.g., tasks with deadlines at midnight, week boundaries)
- Error conditions (e.g., storage quota exceeded, invalid JSON in localStorage)
- Integration between services (e.g., deleting a course cascades to tasks)

**Test Organization:**
- Tests co-located with source files using `.test.ts` suffix
- Separate test files for each service and model
- Mock storage layer for testing business logic in isolation

### Testing Tools

- **Test Framework**: Jest or Vitest
- **Property-Based Testing**: fast-check
- **Assertions**: Built-in framework assertions
- **Coverage**: Aim for >90% code coverage with combined unit and property tests

### Test Data Generators

Custom generators will be created for property-based tests:
- `arbitraryCourse()`: Generates valid course objects
- `arbitraryTask()`: Generates valid task objects with realistic deadlines
- `arbitraryWeekNumber()`: Generates valid ISO week numbers (1-53)
- `arbitraryWhitespaceString()`: Generates strings with only whitespace
- `arbitraryPastDate()`: Generates dates in the past for overdue testing
- `arbitraryFutureDate()`: Generates dates in the future for valid deadlines

## Implementation Notes

### Week Calculation

The system uses ISO 8601 week date system:
- Weeks start on Monday and end on Sunday
- Week 1 is the week containing the first Thursday of the year
- Use standard library functions for week number calculation to ensure consistency

### Date Handling

- All dates stored as ISO 8601 strings in localStorage
- Dates deserialized to Date objects when loaded
- Timezone handling: Use local timezone for display, UTC for storage comparisons
- Deadline comparison: A task is overdue if `deadline < currentDate` and `completed === false`

### Performance Considerations

- In-memory caching of courses and tasks to minimize localStorage reads
- Lazy loading of weekly views (only load tasks for requested week)
- Debounce storage writes to avoid excessive localStorage operations
- Index tasks by week number for faster weekly view queries

### Future Extensibility

The design supports future enhancements:
- Multiple semesters/terms
- Recurring tasks
- Task priorities
- Collaboration features
- Export/import functionality
- Cloud synchronization
